import { Prism } from "prism-react-renderer";

// This file manually registers additional languages for PrismJS
// that might not be bundled with prism-react-renderer by default

// Make Prism available globally as it's required by prism-react-renderer to detect custom languages
// See: https://github.com/FormidableLabs/prism-react-renderer#custom-language-support
(typeof global !== "undefined" ? global : window).Prism = Prism;

// We need to define languages directly rather than using dynamic imports
// to ensure they're available synchronously before components render

// Import JSON language definition
Prism.languages.json = {
  property: {
    pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,
    lookbehind: true,
    greedy: true,
  },
  string: {
    pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
    lookbehind: true,
    greedy: true,
  },
  comment: /\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,
  number: /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
  punctuation: /[{}[\],]/,
  operator: /:/,
  boolean: /\b(?:true|false)\b/,
  null: {
    pattern: /\bnull\b/,
    alias: "keyword",
  },
};

// Ruby language definition
Prism.languages.ruby = {
  comment: [/#.*/, /^=begin\s[\s\S]*?^=end/m],
  string: [
    {
      pattern: /"(?:\\.|[^\\"\r\n])*"/,
      greedy: true,
    },
    {
      pattern: /'(?:\\.|[^\\'\r\n])*'/,
      greedy: true,
    },
    {
      // Use RegExp constructor to avoid escape character issues
      pattern: new RegExp(
        "%[qQrwWx]?(?:\\((?:\\\\.|[^\\\\()])*\\)|[\\[\\]{}]|<(?:\\\\.|[^\\\\<>])*>|[^\\s{(\\[<](?:\\\\.|[^\\\\])*[^\\s})>\\]])",
        "g",
      ),
      greedy: true,
    },
    {
      pattern: /<<[-~]?([a-z_]\w*)[\r\n](?:.*[\r\n])*?[\t ]*\1/i,
      greedy: true,
    },
  ],
  keyword:
    /\b(?:alias|and|BEGIN|begin|break|case|class|def|define_method|defined|do|each|else|elsif|END|end|ensure|extend|for|if|in|include|module|new|next|nil|not|or|prepend|private|protected|public|raise|redo|require|rescue|retry|return|self|super|then|throw|undef|unless|until|when|while|yield)\b/,
  constant: /\b[A-Z]\w*(?:[?!]|\b)/,
  builtin:
    /\b(?:Array|Bignum|Binding|Class|Continuation|Dir|Exception|FalseClass|File|Fixnum|Float|Hash|Integer|IO|MatchData|Method|Module|NilClass|Numeric|Object|Proc|Range|Regexp|String|Struct|Symbol|TrueClass|Thread|Time)\b/,
  variable: /\b[a-z_]\w*(?:[?!]|\b)/,
  symbol: {
    pattern: /(^|[^:]):[a-z_]\w*(?:[?!]|\b)/,
    lookbehind: true,
  },
  regex: {
    // Use RegExp constructor to avoid escape character issues
    pattern: new RegExp(
      "%r(?:\\((?:\\\\.|[^\\\\()])*\\)|[\\[\\]{}]|<(?:\\\\.|[^\\\\<>])*>|[^\\s{(\\[<](?:\\\\.|[^\\\\])*[^\\s})>\\]])",
      "g",
    ),
    greedy: true,
  },
  number: /\b(?:0x[a-f0-9]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/i,
  boolean: /\b(?:true|false)\b/,
  operator:
    /(?:\.{2}|\+\+|--|~|&&|\|\||<<|>>|[=!<>]=?|[+\-*/%^&|]=?|\b(?:and|not|or)\b)/,
  punctuation: /[.,;()[\]{}]/,
};

export default Prism;
