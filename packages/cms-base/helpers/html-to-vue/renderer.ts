//@ts-nocheck
/**
 * Based on the https://github.com/HCESrl/html-to-vue
 */

import { isNode } from "./ast";
import { getOptionsFromNode } from "./getOptionsFromNode";

/**
 * rendering the ast into vue render functions
 * @param {*} ast AST generated by html-parse-stringify
 * @param {*} config our configuration
 * @param {*} createElement vue's createElement
 * @param {*} context vue functional component context
 */
export function renderer(ast, config, createElement, context) {
  function _render(h, node, parent, key, index) {
    if (Array.isArray(node)) {
      const nodes = [];
      // node is an array
      node.forEach((subnode, index) => {
        nodes.push(_render.call(this, h, subnode, node, null, index, h));
      });
      return nodes;
    } else if (isNode(node)) {
      // node is either a node with children or a node or a text node
      if (node.type === "text") {
        return config.textTransformer(node.content); // return text
      }
      if (node.type === "tag") {
        const children = [];
        node.children.forEach((child, index) => {
          children.push(_render.call(this, h, child, node, index));
        });
        // if it's an extra component use custom renderer
        if (typeof config.extraComponentsMap[node.name] !== "undefined") {
          return config.extraComponentsMap[node.name].renderer.call(
            this,
            node,
            children,
            h,
            context
          );
        }
        // else, create normal html element
        return h(node.name, getOptionsFromNode(node), [...children]);
      }
    }
  }
  return createElement(config.container.type, context.data, [
    ..._render.call(this, createElement, ast),
  ]);
}