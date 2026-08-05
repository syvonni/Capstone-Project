/**
 * Reserved Keywords
 * 
 * JavaScript reserved words and other keywords that should not be used
 * as field keys to avoid conflicts and unexpected behavior.
 */

// JavaScript reserved words (ES6+)
export const JS_RESERVED_WORDS = [
  // Keywords
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
  'await',
  'async',
  
  // Future reserved words
  'enum',
  'implements',
  'interface',
  'let',
  'package',
  'private',
  'protected',
  'public',
  'static',
  
  // Object prototype methods/properties
  'constructor',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  
  // Common object methods
  'length',
  'prototype',
  'name',
  'caller',
  'callee',
  'arguments',
  
  // Form-specific reserved words
  'id',
  'key',
  'label',
  'type',
  'required',
  'validation',
  'placeholder',
  'helpText',
  'span',
  'dropdownSource',
  'dropdownOptions',
  'metadataFields',
  'groupFields',
  'minRows',
  'maxRows',
  'showWhen',
  'source',
  'downloadFileName',
  'downloadFileSize',
  'downloadFileType',
  'downloadFileUrl',
]

// React/React Router reserved words
export const REACT_RESERVED_WORDS = [
  'ref',
  'key',
  'children',
  'dangerouslySetInnerHTML',
  'defaultProps',
  'propTypes',
  'context',
  'state',
  'props',
  'componentDidMount',
  'componentDidUpdate',
  'componentWillUnmount',
  'shouldComponentUpdate',
  'getDerivedStateFromProps',
  'getSnapshotBeforeUpdate',
  'componentDidCatch',
  'getDerivedStateFromError',
]

// Common form field names that might cause conflicts
export const FORM_RESERVED_WORDS = [
  'submit',
  'reset',
  'form',
  'action',
  'method',
  'enctype',
  'target',
  'value',
  'checked',
  'selected',
  'disabled',
  'readonly',
  'multiple',
  'size',
  'maxlength',
  'minlength',
  'pattern',
  'required',
  'autocomplete',
  'autofocus',
  'formaction',
  'formenctype',
  'formmethod',
  'formnovalidate',
  'formtarget',
  'placeholder',
  'step',
  'min',
  'max',
]

// Combined list of all reserved words
export const ALL_RESERVED_WORDS = new Set([
  ...JS_RESERVED_WORDS,
  ...REACT_RESERVED_WORDS,
  ...FORM_RESERVED_WORDS,
])

/**
 * Check if a word is reserved
 * @param {string} word - The word to check
 * @returns {boolean} - True if the word is reserved
 */
export function isReservedWord(word) {
  return ALL_RESERVED_WORDS.has(word)
}

/**
 * Check if a word is a JavaScript reserved word
 * @param {string} word - The word to check
 * @returns {boolean} - True if the word is a JS reserved word
 */
export function isJSReservedWord(word) {
  return JS_RESERVED_WORDS.includes(word)
}

/**
 * Check if a word is a React reserved word
 * @param {string} word - The word to check
 * @returns {boolean} - True if the word is a React reserved word
 */
export function isReactReservedWord(word) {
  return REACT_RESERVED_WORDS.includes(word)
}

/**
 * Check if a word is a form-specific reserved word
 * @param {string} word - The word to check
 * @returns {boolean} - True if the word is a form reserved word
 */
export function isFormReservedWord(word) {
  return FORM_RESERVED_WORDS.includes(word)
}
