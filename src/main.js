import '@logseq/libs'
import { createApp } from 'vue'
import App from './App.vue'
import './index.css'

/**
 * user model
 */
function createModel() {
  return {
    openVSCodePicker() {
      logseq.showMainUI()
    },
  }
}

/**
 * app entry
 */
function main() {
  logseq.setMainUIInlineStyle({
    position: 'fixed',
    zIndex: 11,
  })

  const key = logseq.baseInfo.id

  logseq.provideStyle(`
  div[data-injected-ui=open-in-code-${key}] {
    display: flex;
    align-items: center;
    font-weight: 500;
    position: relative;
    top: 0px;
    opacity: 0.7;
  }

  div[data-injected-ui=rebornix-logseq-open-in-code--${key}]:hover a {
    opacity: 1;
  }
  
  div[data-injected-ui=rebornix-logseq-open-in-code--${key}] a.button {
    padding: 6px 6px 0 6px;
  }

  div[data-injected-ui=rebornix-logseq-open-in-code--${key}] iconfont {
    font-size: 18px;
  }
  `)

  // external btns
  logseq.App.registerUIItem('toolbar', {
    key: 'rebornix-logseq-open-in-code',
    template: `
      <a class="button" data-on-click="openVSCodePicker" style="padding-bottom: 0px;">
        <img src="https://code.visualstudio.com/assets/images/code-stable.png" style="width: 16px">
      </a>
    `,
  })

  // main UI
  createApp(App).mount('#app')
}

// bootstrap
logseq
  .useSettingsSchema([{
    key: 'distro',
    type: 'enum',
    title: 'VS Code distro',
    description: 'Open the files in either VS Code Stable or Insiders',
    default: 'stable',
    enumChoices: ['stable', 'insiders'],
    enumPicker: 'select'
  }])
  .ready(createModel()).then(main)
