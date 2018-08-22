// @ts-check

import debug from 'debug';
import ResizeObserver from 'resize-observer-polyfill';
import Widget from './Widget';
import { domready } from '../utils/domready';

const _log = debug('squatch-js:EMBEDwidget');

/**
 * An EmbedWidget is displayed inline in part of your page.
 *
 * To create an EmbedWidget use {@link Widgets}
 *
 */
export default class EmbedWidget extends Widget {

  constructor(params, selector = '#squatchembed') {
    super(params);

    this.element = document.querySelector(selector) || document.querySelector('.squatchembed');

    if (!this.element) throw new Error(`element with selector '${selector}' not found.'`);
  }

  load() {
    const me = this;

    if (!me.element.firstChild || me.element.firstChild.nodeName === '#text') {
      me.element.appendChild(me.frame);
    }

    const frameDoc = me.frame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(me.content);
    frameDoc.close();

    domready(frameDoc, () => {
      // @ts-ignore -- Assume that squatch does exist
      const _sqh = me.frame.contentWindow.squatch;
      const ctaElement = frameDoc.getElementById('cta');

      if (ctaElement) {
        ctaElement.parentNode.removeChild(ctaElement);
      }

      // @ts-ignore -- number will be cast to string by browsers
      this.frame.height = frameDoc.body.scrollHeight;

      // Adjust frame height when size of body changes
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { height } = entry.contentRect;
          // @ts-ignore -- number will be cast to string by browsers
          this.frame.height = height;
        }
      });

      const container = frameDoc.getElementsByTagName('sqh-global-container');
      const fallback = container.length > 0 ? container[0] : frameDoc.getElementsByClassName('squatch-container')[0];

      if (!fallback) _log('Error: no container found.');
      ro.observe(fallback);

      me._loadEvent(_sqh);
      _log('loaded');
    });
  }

  reload(params, jwt) {
    const frameDoc = this.frame.contentWindow.document;

    this.widgetApi.cookieUser({
      user: {
        email: params.email || null,
        firstName: params.firstName || null,
        lastName: params.lastName || null,
      },
      engagementMedium: 'EMBED',
      widgetType: this.type,
      jwt: jwt,
    }).then((response) => {
      if (response.template) {
        this.content = response.template;
        const showStatsBtn = frameDoc.createElement('button');
        const registerForm = frameDoc.getElementsByClassName('squatch-register')[0];

        if (registerForm) {
          showStatsBtn.className = 'btn btn-primary';
          showStatsBtn.id = 'show-stats-btn';
          showStatsBtn.textContent = (this.type === 'REFERRER_WIDGET') ? 'Show Stats' : 'Show Reward';
          showStatsBtn.setAttribute('style', 'margin-top: 10px; max-width: 130px; width: 100%;');
          showStatsBtn.onclick = () => {
            this.load();
          };

          // @ts-ignore -- expect register form to be a stylable element
          registerForm.style.paddingTop = '30px';
          registerForm.innerHTML = `<p><strong>${params.email}</strong><br>Has been successfully registered</p>`;
          registerForm.appendChild(showStatsBtn);
        }
      }
    }).catch((ex) => {
      _log(`${ex.message}`);
    });
  }

  _error(rs, mode = 'embed', style = '') {
    return super._error(rs, mode, style);
  }
}
