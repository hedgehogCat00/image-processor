import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import CodeMirror from 'codemirror';
import { Context } from './entity';
import CloseBucket from 'codemirror/addon/edit/closebrackets.js';

@Component({
  selector: 'app-influxdb-editor',
  templateUrl: './influxdb-editor.component.html',
  styleUrls: ['./influxdb-editor.component.less']
})
export class InfluxdbEditorComponent implements OnInit, AfterViewInit {
  @ViewChild('editorContainer') editorContainerRef: ElementRef;
  private editor;

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.registerMode();
    this.registerInflux();

    this.def('text/influxdb', {
      name: 'influxdb',
      number: /^(?:\d+(\.\d+)?[ymht]?)/,
      keywords: {
        'function': true,
        'from': true
      },
      hooks: {
        '$': (stream) => {
          return 'variable';
        }
      }
    })
    console.log(CloseBucket,);
    this.editor = CodeMirror(this.editorContainerRef.nativeElement, {
      value: '',
      mode: 'text/influxdb',
      theme: 'default',
      autoCloseBrackets: true,
    })
  }

  private registerMode() {
    CodeMirror.defineMode('diff', function () {
      const TOKEN_NAMES = {
        '+': 'positive',
        '-': 'negative',
        '@': 'meta'
      };

      return {
        token(stream) {
          const twPos = stream.string.search(/[\t ]+?$/);
          if (!stream.sol() || twPos === 0) {
            stream.skipToEnd();
            console.error(('error ' + (TOKEN_NAMES[stream.string.charAt(0)] || '')).replace(/ $/, ''))
            // return ('error ' + (TOKEN_NAMES[stream.string.charAt(0)] || '')).replace(/ $/, '');
            return 'error';
          }

          const tokenName = TOKEN_NAMES[stream.peek()] || stream.skipToEnd();

          if (twPos === -1) {
            stream.skipToEnd();
          } else {
            stream.pos = twPos;
          }

          return tokenName;
        }
      }
    });

    CodeMirror.defineMIME('text/x-diff', 'diff');
  }

  private registerInflux() {
    function isTopScope(context: Context) {
      while (true) {
        if (!context || context.type === 'top') {
          return true;
        }
        if (context.type === '}' && context.prev.info != 'namespace') {
          return false;
        }
        context = context.prev;
      }
    }

    function typeBefore(stream, state, pos) {
      if (state.prevToken === 'variable' || state.prevToken === 'type') {
        return true;
      }
      if (/\S(?:[^- ]>|[*\]])\s*$|\*$/.test(stream.string.slice(0, pos))) {
        return true;
      }
      if (state.typeAtEndOfLine && stream.column() === stream.indentation()) {
        return true;
      }
    }

    function pushContext(state, col, type, info?) {
      let indent = state.indented;
      if (
        state.context &&
        state.context.type === 'statement' &&
        type !== 'statement'
      ) {
        indent = state.context.indented;
      }
      return state.context = new Context(indent, col, type, info, null, state.context);
    }

    function popContext(state) {
      const t = state.context.type;
      if (t === ')' || t === ']' || t === '}') {
        state.indented = state.context.indented;
      }
      return state.context = state.context.prev;
    }

    CodeMirror.defineMode('influxdb', function (config, parserConfig) {
      const multilineStrings = parserConfig.multilineStrings;
      const isPunctuationChar = parserConfig.isPunctuationChar || /[\[\]{}\(\),;\:\.]/;
      const numberStart = parserConfig.numberStart || /[\d\.]/;
      const number = parserConfig.number || /^(?:0x[a-f\d]+|0b[01]+|(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)(u|ll?|l|f)?/i;
      const isOperatorChar = parserConfig.isOperatorChar || /[+\-*&%=<>!?|\/]/;
      const isIdentifierChar = parserConfig.isIdentifierChar || /[\w\$_\xa1-\uffff]/;
      const keywords = parserConfig.keywords || {};
      const blockKeywords = parserConfig.blockKeywords || {};
      const defKeywords = parserConfig.defKeywords || {};
      const atoms = parserConfig.atoms || {};
      const indentUnit = config.indentUnit;
      const indentStatements = parserConfig.indentStatements !== false;
      const statementIndentUnit = parserConfig.statementIndentUnit || indentUnit;
      const dontAlignCalls = parserConfig.dontAlignCalls;
      const hooks = parserConfig.hooks || {}

      let currPunc, isDefKeyword;

      function tokenBase(stream, state) {

        const ch = stream.next();
        // Hook
        if (hooks[ch]) {
          var result = hooks[ch](stream, state);
          if (result !== false) return result;
        }
        // is String
        if (ch === '"') {
          state.tokenize = tokenString(ch);
          return state.tokenize(stream, state);
        }
        // is Number
        if (numberStart.test(ch)) {
          stream.backUp(1);
          if (stream.match(number)) {
            return 'number';
          }
          stream.next();
        }
        // // is Duration
        // if (/[ymht]/.test(ch)) {
        //   stream.backUp(2);
        //   // if (stream.match(number)) {
        //   //   return 'number';
        //   // }
        //   // stream.next();
        //   if (number.test(stream.current())) {
        //     return 'number';
        //   }
        //   stream.next();
        //   stream.next();
        // }
        // is Punctuation
        if (isPunctuationChar.test(ch)) {
          currPunc = ch;
          return null;
        }
        // is Comment
        if (ch === '/') {
          // if(stream.eat('*')){
          //   state.tokenize=tokenComment;
          //   return state.tokenize(stream, state);
          // }
          if (stream.eat('/')) {
            stream.skipToEnd();
            return 'comment';
          }
        }
        // is Operator
        if (isOperatorChar.test(ch)) {
          while (!stream.match(/^\/[\/\*]/, false)) {
            stream.eat(isOperatorChar);
          }
          return 'operator';
        }

        stream.eatWhile(isIdentifierChar);

        const curr = stream.current();
        if (contains(keywords, curr)) {
          if (contains(blockKeywords, curr)) {
            currPunc = 'newstatement';
          }
          if (contains(defKeywords, curr)) {
            isDefKeyword = true;
          }
          return 'keyword';
        }
        if (contains(atoms, curr)) {
          return 'atom';
        }
        return 'variable';
      }

      function tokenString(quote: string) {
        return (stream, state) => {
          let escaped = false;
          let next;
          let end = false;
          // while ((next = stream.next()) !== null) {
          // 判断 undefined
          while ((next = stream.next()) && next !== null && next !== undefined) {
            if (next === quote && !escaped) {
              end = true;
              break;
            }
            escaped = !escaped && next == '\\';
          }
          if (end || !(escaped || multilineStrings)) {
            state.tokenize = null;
          }
          return 'string';
        }
      }

      function contains(words: any, word: string) {
        if (typeof words === 'function') {
          return words(word);
        } else {
          return words.propertyIsEnumerable(word);
        }
      }

      function maybeEOL(stream, state) {
        if (parserConfig.typeFirstDefinitions && stream.eol() && isTopScope(state.context)) {
          state.typeAtEndOfLine = typeBefore(stream, state, stream.pos);
        }
      }

      return {
        startState(basecolumn = 0) {
          return {
            tokenize: null,
            context: new Context(basecolumn - indentUnit, 0, 'top', null, false),
            indented: 0,
            startOfLine: true,
            prevToken: null
          }
        },

        token(stream, state) {
          let ctx: Context = state.context;
          if (stream.sol()) {
            if (ctx.align === null) {
              ctx.align = false;
            }
            state.indented = stream.indentation();
            state.startOfLine = true;
          }
          if (stream.eatSpace()) {
            maybeEOL(stream, state);
            return null;
          }

          currPunc = isDefKeyword = null;
          let style = (state.tokenize || tokenBase)(stream, state);
          if (style === 'comment' || style === 'meta') {
            return style;
          }
          if (ctx.align === null) {
            ctx.align = true;
          }

          if (
            currPunc === ';' ||
            currPunc === ':' ||
            (currPunc === ',' && stream.match(/^\s*(?:\/\/.*)?$/, false))
          ) {
            while (state.context.type === 'statement') {
              popContext(state);
            }
          }
          else if (currPunc === '{') {
            pushContext(state, stream.column(), '}');
          }
          else if (currPunc === '[') {
            pushContext(state, stream.column(), ']');
          }
          else if (currPunc === '(') {
            pushContext(state, stream.column(), ')');
          }
          else if (currPunc === '}') {
            while (ctx.type === 'statement') {
              ctx = popContext(state);
            }
            if (ctx.type === '}') {
              ctx = popContext(state);
            }
            while (ctx.type === 'statement') {
              ctx = popContext(state);
            }
          } else if (currPunc === ctx.type) {
            popContext(state);
          } else if (
            indentStatements &&
            (
              (ctx.type === '}' || ctx.type === 'top') &&
              currPunc !== ';' ||
              (ctx.type === 'statement' && currPunc === 'newstatement')
            )
          ) {
            pushContext(state, stream.column(), "statement", stream.current());
          }

          if (
            style === 'variable' &&
            (state.prevToken === 'def' ||
              parserConfig.typeFirstDefinitions &&
              typeBefore(stream, state, stream.start) &&
              isTopScope(state.context) &&
              stream.match(/^\s*\(/, false)
            )
          ) {
            style = 'def';
          }

          if (style === 'def' && parserConfig.styleDefs === false) {
            style = 'variable';
          }

          state.startOfLine = false;
          state.prevToken = isDefKeyword ? 'def' : style || currPunc;
          maybeEOL(stream, state);
          return style;
        },

        indent(state, textAfter) {
          if (
            state.tokenize !== tokenBase && state.tokenize !== null ||
            state.typeAtEndOfLine) {
            return CodeMirror.Pass;
          }

          let ctx = state.context;
          const firstChar = textAfter && textAfter.charAt(0);
          const closing = firstChar === ctx.type;

          if (ctx.type === 'statement' && firstChar === '}') {
            ctx = ctx.prev;
          }
          if (parserConfig.dontIndentStatements) {
            while (ctx.type === 'statement' && parserConfig.dontIndentStatements.test(ctx.info)) {
              ctx = ctx.prev;
            }
          }

          if (parserConfig.allmanIndentation && /[{(]/.test(firstChar)) {
            while (ctx.type != "top" && ctx.type != "}") ctx = ctx.prev
            return ctx.indented
          }
          if (ctx.type === 'statement') {
            return ctx.indented + (firstChar == "{" ? 0 : statementIndentUnit);
          }
          if (ctx.align && (!dontAlignCalls || ctx.type != ")")) {
            return ctx.column + (closing ? 0 : 1);
          }
          if (ctx.type == ")" && !closing) {
            return ctx.indented + statementIndentUnit;
          }

          return ctx.indented + (closing ? 0 : indentUnit);
        },

        electricInput: /^\s*[{}]$/,
        blockCommentStart: "/*",
        blockCommentEnd: "*/",
        blockCommentContinue: " * ",
        lineComment: "//",
        fold: "brace"
      }
    });
  }

  private def(mimes: string | string[], mode) {
    if (typeof mimes === 'string') {
      mimes = [mimes];
    }
    const words = [];
    const add = (obj) => {
      if (obj) {
        words.push(...Object.keys(obj));
      }
    }

    add(mode.keywords);
    add(mode.types);
    add(mode.atoms);
    add(mode.builtin);

    if (words.length) {
      mode.helperType = mimes[0];
      CodeMirror.registerHelper('hintWords', mimes[0], words);
    }

    mimes.forEach(mime => {
      CodeMirror.defineMIME(mime, mode);
    });
  }
}
