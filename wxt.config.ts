import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  webExt: {
    disabled: true,
    chromiumArgs: ["--user-data-dir=./.wxt/chrome-data"],
  },
  manifest: {
    permissions: ["downloads", "scripting", "activeTab", "storage", "declarativeNetRequest"],
    host_permissions: ["<all_urls>"],
    web_accessible_resources: [
      {
        resources: ["/injected.js"],
        matches: ["*://*.xiaoshujiang.com/*", "*://*.douyin.com/*"]
      },
    ],
    externally_connectable: {
      "matches": ["*://*.douyin.com/*"]
    },
  },
});
