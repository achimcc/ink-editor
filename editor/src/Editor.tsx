import React from "react";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import MonacoEditor from "react-monaco-editor";

import "monaco-editor/esm/vs/editor/browser/controller/coreCommands";
import "monaco-editor/esm/vs/editor/browser/widget/codeEditorWidget";
import "monaco-editor/esm/vs/editor/browser/widget/diffEditorWidget";
import "monaco-editor/esm/vs/editor/browser/widget/diffNavigator";
import "monaco-editor/esm/vs/editor/contrib/anchorSelect/anchorSelect";
import "monaco-editor/esm/vs/editor/contrib/bracketMatching/bracketMatching";
import "monaco-editor/esm/vs/editor/contrib/caretOperations/caretOperations";
import "monaco-editor/esm/vs/editor/contrib/caretOperations/transpose";
import "monaco-editor/esm/vs/editor/contrib/clipboard/clipboard";
import "monaco-editor/esm/vs/editor/contrib/codeAction/codeActionContributions";
import "monaco-editor/esm/vs/editor/contrib/codelens/codelensController";
import "monaco-editor/esm/vs/editor/contrib/colorPicker/colorContributions";
import "monaco-editor/esm/vs/editor/contrib/comment/comment";
import "monaco-editor/esm/vs/editor/contrib/contextmenu/contextmenu";
import "monaco-editor/esm/vs/editor/contrib/cursorUndo/cursorUndo";
import "monaco-editor/esm/vs/editor/contrib/dnd/dnd";
import "monaco-editor/esm/vs/editor/contrib/documentSymbols/documentSymbols";
import "monaco-editor/esm/vs/editor/contrib/find/findController";
import "monaco-editor/esm/vs/editor/contrib/folding/folding";
import "monaco-editor/esm/vs/editor/contrib/fontZoom/fontZoom";
import "monaco-editor/esm/vs/editor/contrib/format/formatActions";
import "monaco-editor/esm/vs/editor/contrib/gotoError/gotoError";
import "monaco-editor/esm/vs/editor/contrib/gotoSymbol/goToCommands";
import "monaco-editor/esm/vs/editor/contrib/gotoSymbol/link/goToDefinitionAtPosition";
import "monaco-editor/esm/vs/editor/contrib/hover/hover";
import "monaco-editor/esm/vs/editor/contrib/inPlaceReplace/inPlaceReplace";
import "monaco-editor/esm/vs/editor/contrib/indentation/indentation";
import "monaco-editor/esm/vs/editor/contrib/inlineHints/inlineHintsController";
import "monaco-editor/esm/vs/editor/contrib/linesOperations/linesOperations";
import "monaco-editor/esm/vs/editor/contrib/linkedEditing/linkedEditing";
import "monaco-editor/esm/vs/editor/contrib/links/links";
import "monaco-editor/esm/vs/editor/contrib/multicursor/multicursor";
import "monaco-editor/esm/vs/editor/contrib/parameterHints/parameterHints";
import "monaco-editor/esm/vs/editor/contrib/rename/rename";
import "monaco-editor/esm/vs/editor/contrib/smartSelect/smartSelect";
import "monaco-editor/esm/vs/editor/contrib/snippet/snippetController2";
import "monaco-editor/esm/vs/editor/contrib/suggest/suggestController";
import "monaco-editor/esm/vs/editor/contrib/toggleTabFocusMode/toggleTabFocusMode";
import "monaco-editor/esm/vs/editor/contrib/unusualLineTerminators/unusualLineTerminators";
import "monaco-editor/esm/vs/editor/contrib/viewportSemanticTokens/viewportSemanticTokens";
import "monaco-editor/esm/vs/editor/contrib/wordHighlighter/wordHighlighter";
import "monaco-editor/esm/vs/editor/contrib/wordOperations/wordOperations";
import "monaco-editor/esm/vs/editor/contrib/wordPartOperations/wordPartOperations";
import "monaco-editor/esm/vs/editor/standalone/browser/accessibilityHelp/accessibilityHelp";
import "monaco-editor/esm/vs/editor/standalone/browser/iPadShowKeyboard/iPadShowKeyboard";
import "monaco-editor/esm/vs/editor/standalone/browser/inspectTokens/inspectTokens";
import "monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneCommandsQuickAccess";
import "monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoLineQuickAccess";
import "monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoSymbolQuickAccess";
import "monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneHelpQuickAccess";
import "monaco-editor/esm/vs/editor/standalone/browser/referenceSearch/standaloneReferenceSearch";
import "monaco-editor/esm/vs/editor/standalone/browser/toggleHighContrast/toggleHighContrast";

import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import * as rustConf from "monaco-editor/esm/vs/basic-languages/rust/rust";

const Editor = () => {
  var state: any;
  var allTokens;
  const editorDidMount = (
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    monaco: typeof monacoEditor
  ) => {
    console.log("editorDidMount", editor);
    const modeId = "ra-rust"; // not "rust" to circumvent conflict
    monaco.languages.register({
      // language for editor
      id: modeId,
    });
    monaco.languages.register({
      // language for hover info
      id: "rust",
    });

    monaco.languages.onLanguage(modeId, async () => {
      console.log(modeId);

      monaco.languages.setLanguageConfiguration(
        modeId,
        rustConf.conf as monacoEditor.languages.LanguageConfiguration
      );
      monaco.languages.setLanguageConfiguration(
        "rust",
        rustConf.conf as monacoEditor.languages.LanguageConfiguration
      );
      monaco.languages.setMonarchTokensProvider(
        "rust",
        rustConf.language as monacoEditor.languages.IMonarchLanguage
      );

      monaco.languages.registerHoverProvider(modeId, {
        provideHover: (_, pos) => state.hover(pos.lineNumber, pos.column),
      });
      monaco.languages.registerCodeLensProvider(modeId, {
        async provideCodeLenses(m) {
          const code_lenses = await state.code_lenses();
          const lenses = code_lenses.map(({ range, command }: any) => {
            const position = {
              column: range.startColumn,
              lineNumber: range.startLineNumber,
            };

            const references = command.positions.map((pos: any) => ({
              range: pos,
              uri: m.uri,
            }));
            return {
              range,
              command: {
                id: command.id,
                title: command.title,
                arguments: [m.uri, position, references],
              },
            };
          });

          return { lenses, dispose() {} };
        },
      });
      monaco.languages.registerReferenceProvider(modeId, {
        async provideReferences(m, pos, { includeDeclaration }) {
          const references = await state.references(
            pos.lineNumber,
            pos.column,
            includeDeclaration
          );
          if (references) {
            return references.map(({ range }: any) => ({ uri: m.uri, range }));
          }
        },
      });
      monaco.languages.registerDocumentHighlightProvider(modeId, {
        async provideDocumentHighlights(_, pos) {
          return await state.references(pos.lineNumber, pos.column, true);
        },
      });
      monaco.languages.registerCompletionItemProvider(modeId, {
        triggerCharacters: [".", ":", "="],
        async provideCompletionItems(_m, pos) {
          const suggestions = await state.completions(
            pos.lineNumber,
            pos.column
          );
          if (suggestions) {
            return { suggestions };
          }
        },
      });
      monaco.languages.registerSignatureHelpProvider(modeId, {
        signatureHelpTriggerCharacters: ["(", ","],
        async provideSignatureHelp(_m, pos) {
          const value = await state.signature_help(pos.lineNumber, pos.column);
          if (!value) return null;
          return {
            value,
            dispose() {},
          };
        },
      });
      monaco.languages.registerDefinitionProvider(modeId, {
        async provideDefinition(m, pos) {
          const list = await state.definition(pos.lineNumber, pos.column);
          if (list) {
            return list.map((def: any) => ({ ...def, uri: m.uri }));
          }
        },
      });
      monaco.languages.registerTypeDefinitionProvider(modeId, {
        async provideTypeDefinition(m, pos) {
          const list = await state.type_definition(pos.lineNumber, pos.column);
          if (list) {
            return list.map((def: any) => ({ ...def, uri: m.uri }));
          }
        },
      });
      monaco.languages.registerImplementationProvider(modeId, {
        async provideImplementation(m, pos) {
          const list = await state.goto_implementation(
            pos.lineNumber,
            pos.column
          );
          if (list) {
            return list.map((def: any) => ({ ...def, uri: m.uri }));
          }
        },
      });
      monaco.languages.registerDocumentSymbolProvider(modeId, {
        async provideDocumentSymbols() {
          return await state.document_symbols();
        },
      });
      monaco.languages.registerOnTypeFormattingEditProvider(modeId, {
        autoFormatTriggerCharacters: [".", "="],
        async provideOnTypeFormattingEdits(_, pos, ch) {
          return await state.type_formatting(pos.lineNumber, pos.column, ch);
        },
      });
      monaco.languages.registerFoldingRangeProvider(modeId, {
        async provideFoldingRanges() {
          return await state.folding_ranges();
        },
      });

      class TokenState {
        line: number;
        equals: () => boolean;
        constructor(line = 0) {
          this.line = line;
          this.equals = () => true;
        }

        clone() {
          const res = new TokenState(this.line);
          res.line += 1;
          return res;
        }
      }

      function fixTag(tag: string) {
        switch (tag) {
          case "builtin":
            return "variable.predefined";
          case "attribute":
            return "key";
          case "macro":
            return "number.hex";
          case "literal":
            return "number";
          default:
            return tag;
        }
      }
    });
    editor.focus();
  };
  const onChange = (newValue: any, e: any) => {
    console.log("onChange", newValue, e);
  };
  const options = {
    selectOnLineNumbers: true,
  };
  return (
    <>
      <MonacoEditor
        width="800"
        height="600"
        language="javascript"
        theme="vs-dark"
        value={undefined}
        options={options}
        onChange={onChange}
        editorDidMount={editorDidMount}
      />
    </>
  );
};

export default Editor;
