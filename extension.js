const vscode = require("vscode");
const fsp = require("fs").promises;
const existsSync = require("fs").existsSync;
const firstline = require("firstline");
const moment = require("moment");
const homedir = require("os").homedir();

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  let openCommand = vscode.commands.registerCommand(
    "dailyNotes.open",
    async function () {
      await prepareFile();
      const filePath = getFilePath();

      vscode.workspace.openTextDocument(filePath).then((doc) => {
        vscode.window.showTextDocument(doc);
      });
    }
  );

  let insertCommand = vscode.commands.registerCommand(
    "dailyNotes.insert",
    function () {
      vscode.window
        .showInputBox({
          ignoreFocusOut: true,
          prompt: `Enter text to add to notes 📘`,
        })
        .then(async (text) => {
          if (!text) {
            // canceled
            return;
          }

          await prepareFile();
          const filePath = getFilePath();
          try {
            await appendToFileAtLine(filePath, text, 2);
          } catch (error) {
            console.error(error);
            return vscode.window.showErrorMessage(
              "Cannot edit Daily Notes File."
            );
          }
        });
    }
  );

  async function setSyntaxHighlight(extensionPath) {
    const currentConfig = vscode.workspace.getConfiguration(
      "editor.tokenColorCustomizations"
    );

    if (currentConfig.has("textMateRules")) return;

    const colors = await fsp.readFile(
      extensionPath + "/syntaxes/custom-colors.json",
      "utf8"
    );

    let mutableConfig = JSON.parse(JSON.stringify(currentConfig));

    mutableConfig.textMateRules = JSON.parse(colors.toString());

    vscode.workspace
      .getConfiguration("editor")
      .update(
        "tokenColorCustomizations",
        mutableConfig,
        vscode.ConfigurationTarget.Global
      );
  }

  async function prepareFile() {
    const filePath = getFilePath();

    await setSyntaxHighlight(context.extensionPath);

    if (existsSync(filePath)) {
      await prependDateHeader(filePath);
    } else {
      await createNewNote(filePath);
    }
  }

  function getFilePath() {
    const configFilePath = vscode.workspace
      .getConfiguration()
      .get("dailyNotes.filePath");

    if (configFilePath) {
      return configFilePath;
    } else {
      return homedir + "/daily-notes.md";
    }
  }

  function dateHeader() {
    const today = new Date();
    const configDateFormat = vscode.workspace
      .getConfiguration()
      .get("dailyNotes.dateFormat");

    if (configDateFormat) {
      return "## " + moment(today).format(configDateFormat) + "\r\n\r\n\r\n";
    } else {
      return "## " + today.toDateString() + "\r\n\r\n\r\n";
    }
  }

  async function prependDateHeader(filePath) {
    const lastDateHeader = await firstline(filePath);
    if (lastDateHeader.trim() != dateHeader().trim()) {
      await prependFile(filePath, dateHeader());
    }
  }

  async function prependFile(filePath, content) {
    const result = await fsp.readFile(filePath, "utf8");

    if (result) {
      content = content + "\n" + result;
    }

    await fsp.writeFile(filePath, content);
  }

  async function appendToFileAtLine(filePath, content, lineNumber) {
    const result = await fsp.readFile(filePath, "utf8");

    var lines = result.toString().split("\n");
    lines.splice(lineNumber, 0, content);
    content = lines.join("\n");

    await fsp.writeFile(filePath, content);
  }

  async function createNewNote(filePath) {
    try {
      await fsp.writeFile(filePath, dateHeader());
    } catch (error) {
      console.error(error);
      return vscode.window.showErrorMessage(
        "Please set correct Daily Notes File Path in Config."
      );
    }
  }

  context.subscriptions.push(openCommand, insertCommand);
}
exports.activate = activate;

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
