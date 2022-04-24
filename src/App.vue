<template>
  <div class="container-wrap" @click="_onClickOutside">
    <div
      class="container-inner shadow-lg"
      v-if="ready"
      :style="{ left: left + 'px', top: top + 'px' }"
    >
      <div class="_opener" @click="_onClickOpenCurrentPage">
        Edit current page
      </div>
      <div class="_opener" @click="_onClickOpenConfig">Edit config.edn</div>
      <div class="_opener" @click="_onClickOpenCSS">Edit custom.css</div>
      <div class="_opener" @click="_onClickOpenCurrentGraph">
        Open graph folder
      </div>
    </div>
  </div>
</template>

<script>

function generateUrl(path) {
  const { distro } = logseq.settings;
  const protocol = distro === 'stable' ? 'vscode' : 'vscode-insiders';
  return `${protocol}://file/` + path;
}

function openConfig(name) {
  logseq.App.getCurrentGraph().then((graph) => {
    window.open(generateUrl(graph.url.replace("logseq_local_", "") + "/logseq/" + name));
  });
}

function openGraph() {
  logseq.App.getCurrentGraph().then((graph) => {
    window.open(generateUrl(graph.url.replace("logseq_local_", "")));

  });
}

function openPageInVSCode() {
  logseq.Editor.getCurrentPage().then((currentPage) => {
    if (currentPage && currentPage.file) {
      const fileId = currentPage.file.id;
      logseq.DB.datascriptQuery(
        `[:find ?file
                :where
                [?b :file/path ?file]
                [(== ?b ${fileId})]
            ]`
      ).then((matches) => {
        if (matches && matches.length > 0) {
          const file = matches[0][0];
          window.open(generateUrl(file));
        } else {
          // openGraph();
        }
      });
    } else {
      // TODO: find ansestor which is a page
      // openGraph();
    }
  });
}

export default {
  name: "App",

  data() {
    return {
      ready: false,
      left: 0,
      top: 0,
      opts: {},
    };
  },

  mounted() {
    logseq.App.getUserConfigs().then(
      (c) => (this.opts[`is-dark`] = c.preferredThemeMode === "dark")
    );

    logseq.App.onThemeModeChanged(({ mode }) => {
      this.opts[`is-dark`] = mode === "dark";
    });

    logseq.once("ui:visible:changed", ({ visible }) => {
      visible && (this.ready = true);
    });

    logseq.on("ui:visible:changed", ({ visible }) => {
      if (visible) {
        const key = logseq.baseInfo.id;
        const el = top.document.querySelector(
          `div[data-injected-ui=open-in-code--${key}]`
        );
        const rect = el.getBoundingClientRect();
        this.left = rect.left - 50;
        this.top = rect.top + 30;
      }
    });
  },

  methods: {
    _onClickOutside({ target }) {
      const inner = target.closest(".container-inner");

      !inner && logseq.hideMainUI();
    },
    _onClickOpenCurrentPage() {
      openPageInVSCode();
    },
    _onClickOpenCurrentGraph() {
      openGraph();
    },
    _onClickOpenConfig() {
      openConfig("config.edn");
    },
    _onClickOpenCSS() {
      openConfig("custom.css");
    },
  },
};
</script>
