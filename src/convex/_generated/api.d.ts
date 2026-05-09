/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as files from "../files.js";
import type * as flipbooks from "../flipbooks.js";
import type * as lib_session from "../lib/session.js";
import type * as posterGenerations from "../posterGenerations.js";
import type * as posterInternal from "../posterInternal.js";
import type * as posters from "../posters.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  files: typeof files;
  flipbooks: typeof flipbooks;
  "lib/session": typeof lib_session;
  posterGenerations: typeof posterGenerations;
  posterInternal: typeof posterInternal;
  posters: typeof posters;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
