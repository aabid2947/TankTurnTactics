/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as auth from "../auth.js";
import type * as engine_index from "../engine/index.js";
import type * as engine_resolve from "../engine/resolve.js";
import type * as engine_types from "../engine/types.js";
import type * as games from "../games.js";
import type * as http from "../http.js";
import type * as jury from "../jury.js";
import type * as lib_cost from "../lib/cost.js";
import type * as lib_geometry from "../lib/geometry.js";
import type * as lib_jury from "../lib/jury.js";
import type * as lib_rng from "../lib/rng.js";
import type * as lib_spawn from "../lib/spawn.js";
import type * as resolve from "../resolve.js";
import type * as trade from "../trade.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  auth: typeof auth;
  "engine/index": typeof engine_index;
  "engine/resolve": typeof engine_resolve;
  "engine/types": typeof engine_types;
  games: typeof games;
  http: typeof http;
  jury: typeof jury;
  "lib/cost": typeof lib_cost;
  "lib/geometry": typeof lib_geometry;
  "lib/jury": typeof lib_jury;
  "lib/rng": typeof lib_rng;
  "lib/spawn": typeof lib_spawn;
  resolve: typeof resolve;
  trade: typeof trade;
  users: typeof users;
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

export declare const components: {};
