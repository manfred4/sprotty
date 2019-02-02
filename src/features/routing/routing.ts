/********************************************************************************
 * Copyright (c) 2018 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { Point } from "../../utils/geometry";
import { Routable } from "./model";
import { InstanceRegistry } from "../../utils/registry";
import { ManhattanEdgeRouter } from "./manhattan-edge-router";
import { PolylineEdgeRouter } from "./polyline-edge-router";
import { injectable } from "inversify";
import { ResolvedHandleMove } from "../edit/edit-routing";
import { SRoutingHandle } from "../edit/model";

export interface RoutedPoint extends Point {
    kind: 'source' | 'target' | 'linear'
    pointIndex?: number
}

export interface IEdgeRouter {
    route(edge: Routable): RoutedPoint[]

    /**
     * Calculates a point on the edge
     *
     * @param edge
     * @param t a value between 0 (sourceAnchor) and 1 (targetAnchor)
     * @returns the point or undefined if t is out of bounds or it cannot be computed
     */
    pointAt(edge: Routable, t: number): Point | undefined

    /**
     * Calculates the derivative at a point on the edge.
     *
     * @param edge
     * @param t a value between 0 (sourceAnchor) and 1 (targetAnchor)
     * @returns the point or undefined if t is out of bounds or it cannot be computed
     */
    derivativeAt(edge: Routable, t: number): Point | undefined

    /**
     * Creates the routing handles for the given target.
     *
     * @param editTarget
     */
    createRoutingHandles(editTarget: Routable): void

    getHandlePosition(edge: Routable, handle: SRoutingHandle): Point | undefined

    applyHandleMoves(edge: Routable, moves: ResolvedHandleMove[]): void;

    cleanupRoutingPoints(edge: Routable, routingPoints: Point[], updateHandles: boolean,
                         sourcePos?: Point, targetPos?: Point): void;
}


@injectable()
export class EdgeRouterRegistry extends InstanceRegistry<IEdgeRouter> {

    constructor() {
        super();
        this.register(PolylineEdgeRouter.KIND, new PolylineEdgeRouter());
        this.register(ManhattanEdgeRouter.KIND, new ManhattanEdgeRouter());
    }

    protected get defaultType() {
        return PolylineEdgeRouter.KIND;
    }

    get(type: string | undefined): IEdgeRouter {
        return super.get(type || this.defaultType);
    }
}
