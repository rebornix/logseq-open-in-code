<template>
  <div class="container-wrap" v-bind:class="{ lspdark: opts.isDark }" @click="_onClickOutside">
    <div class="container-inner shadow-lg" v-if="ready" :style="{ left: left + 'px', top: top + 'px' }">
      <div class="_opener" v-if="currentPage" @click="_onClickOpenCurrentPage">
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

function generateUrl(path, line_num = 0) {
  const { distro } = logseq.settings;
  const protocol = distro === "stable" ? "vscode" : distro === "insiders" ? "vscode-insiders" : "vscodium";
  return `${protocol}://file/` + encodeURIComponent(path) + `:${line_num}:0` + "?windowId=_blank";
}

async function openConfig(name) {
  const graph = await logseq.App.getCurrentGraph();
  window.open(
    generateUrl(graph.url.replace("logseq_local_", "") + "/logseq/" + name)
  );
}

async function openGraph() {
  const graph = await logseq.App.getCurrentGraph();
  window.open(generateUrl(graph.url.replace("logseq_local_", "")));
}

async function getAncestorPageOfCurrentBlock() {
  const block = await logseq.Editor.getCurrentBlock();
  return block?.page;
}

async function findFile(fileId) {
  const graph = await logseq.App.getCurrentGraph();

  const matches = await logseq.DB.datascriptQuery(
    `[:find ?file
                :where
                [?b :file/path ?file]
                [(== ?b ${fileId})]
            ]`
  );

  if (matches && matches.length > 0) {
    const file = graph.url.replace("logseq_local_", "") + "/" + matches[0][0];
    return file;
  } else {
    return null;
  }
}

async function openPageLineInVSCode(line_number) {
  const currentPage = await logseq.Editor.getCurrentPage();
  if (currentPage && currentPage.file) {
    const fileId = currentPage.file.id;
    const file = await findFile(fileId);

    if (file) {
      window.open(generateUrl(file, line_number));
      return;
    }
  }

  const ansetor = await getAncestorPageOfCurrentBlock();
  if (ansetor) {
    const page = await logseq.Editor.getPage(ansetor.id);
    if (page && page.file) {
      const fileId = page.file.id;
      const file = await findFile(fileId);
      if (file) {
        window.open(generateUrl(file, line_number));
        return;
      }
    }
  }
}

function openPageInVSCode() {
  return openPageLineInVSCode(0);
}

function reorder_children(children) {
  let id_chains = children.map(child => child.left);

  children.sort((a, b) => {
    let indexA = id_chains.indexOf(a.left);
    let indexB = id_chains.indexOf(b.left);
    if (indexA < indexB) {
      return -1;
    } else if (indexA > indexB) {
      return 1;
    } else {
      return 0;
    }
  });
}

// To count the line number of a block in correct order, we need to reorder the children of the block
function count_line_in_block(block, line, reorder = false) {
  let count = 0;
  let found_line = false;

  if (block.children.length > 0) {
    if (reorder) {
      reorder_children(block.children);
    }
    block.children.forEach(child => {
      let search_subblock = count_line_in_block(child, line);
      if (!found_line) {
        count += search_subblock.lineCount;
        found_line = found_line || search_subblock.hasLine;
      }
    });
    return { lineCount: block.content.split('\n').length + count, hasLine: block.id === line.id || found_line };
  } else {
    return { lineCount: block.content.split('\n').length, hasLine: block.id === line.id };
  }
}

async function openCurrentLine() {

  let count = 0;

  let curb = await logseq.Editor.getCurrentBlock();

  let all_blocks = await logseq.Editor.getCurrentPageBlocksTree();
  if (all_blocks.length === 1 && !('content' in all_blocks[0])) {
    // It seems possible to get a page by name but not id. Strange
    const page = await logseq.Editor.getPage(curb?.page.id);
    all_blocks = await logseq.Editor.getPageBlocksTree(page.name);
  }

  for (let index = 0; index < all_blocks.length; index++) {
    const block = all_blocks[index];
    let subcount = count_line_in_block(block, curb);
    if (subcount.hasLine) {
      // If found current line, it's compulsory to count the line number of the block in correct order between its siblings
      subcount = count_line_in_block(block, curb, true);
      count += Math.floor(subcount.lineCount / 2);
      // this leads to the end of the block:
      // count += subcount.lineCount 
      // TODO get the exact line number? 
      break;
    } else {
      count += subcount.lineCount;
    }
  }

  await openPageLineInVSCode(count);
}

async function registerShortcuts() {
  logseq.App.registerCommandPalette({
    key: `Open_current_line_in_default_editor`,
    label: "Open current line in default editor",
    keybinding: {
      binding: logseq.settings.key_open_line,
      mode: "global",
    }
  },
    openCurrentLine
  );
  logseq.App.registerCommandPalette({
    key: `Open_current_page_in_default_editor`,
    label: "Open current page in default editor",
    keybinding: {
      binding: logseq.settings.key_open_page,
      mode: "global",
    }
  },
    openPageInVSCode
  );

  logseq.App.registerCommandPalette({
    key: `Open_graph_folder_in_default_editor`,
    label: "Open graph folder in default editor",
    keybinding: {
      binding: logseq.settings.key_open_graph,
      mode: "global",
    }
  },
    openGraph
  );
}

export default {
  name: "App",

  data() {
    return {
      ready: false,
      left: 0,
      top: 0,
      currentPage: false,
      opts: {
        isDark: false,
      },
    };
  },

  mounted() {
    logseq.App.getUserConfigs().then(
      (c) => (this.opts.isDark = c.preferredThemeMode === "dark")
    );

    logseq.App.onThemeModeChanged(({ mode }) => {
      this.opts.isDark = mode === "dark";
    });

    logseq.once("ui:visible:changed", ({ visible }) => {
      visible && (this.ready = true);
    });

    const checkCurrentPage = async () => {
      const currentPage = await logseq.Editor.getCurrentPage();

      if (currentPage && currentPage.file) {
        this.currentPage = true;
      } else {
        const ansestor = await getAncestorPageOfCurrentBlock();
        if (ansestor) {
          this.currentPage = true;
        } else {
          this.currentPage = false;
        }
      }
    };

    logseq.on("ui:visible:changed", ({ visible }) => {
      if (visible) {
        const el = top.document.querySelector(`a#open-in-code-anchor`);
        const rect = el.getBoundingClientRect();
        this.left = rect.left - 50;
        this.top = rect.top + 30;
        checkCurrentPage();
      }
    });

    logseq.App.onRouteChanged(({ path }) => {
      checkCurrentPage();
    });

    checkCurrentPage();

    registerShortcuts();
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
