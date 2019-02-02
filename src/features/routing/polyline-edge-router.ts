/********************************************************************************
 * Copyright (c) 2019 TypeFox and others.
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

import { injectable } from "inversify";
import { center, maxDistance, Point, angleBetweenPoints, centerOfLine } from "../../utils/geometry";
import { LinearEdgeRouter, LinearRouteOptions } from "./linear-edge-router";
import { Routable } from "./model";
import { RoutedPoint } from "./routing";
import { SRoutingHandle } from "../edit/model";
import { ResolvedHandleMove } from "../edit/edit-routing";

export interface PolylineRouteOptions extends LinearRouteOptions {
    /** The angle in radians below which a routing handle is removed. */
    removeAngleThreshold: number;
}

@injectable()
export class PolylineEdgeRouter extends LinearEdgeRouter {
    static readonly KIND = 'polyline';

    route(edge: Routable, options: PolylineRouteOptions = { minimalPointDistance: 2, removeAngleThreshold: 0.1 }): RoutedPoint[] {
        const source = edge.source;
        const target = edge.target;
        if (source === undefined || target === undefined) {
            return [];
        }

        let sourceAnchor: Point;
        let targetAnchor: Point;
        const rpCount = edge.routingPoints !== undefined ? edge.routingPoints.length : 0;
        if (rpCount >= 1) {
            // Use the first routing point as start anchor reference
            const p0 = edge.routingPoints[0];
            sourceAnchor = source.getTranslatedAnchor(p0, edge.parent, edge, edge.sourceAnchorCorrection);
            // Use the last routing point as end anchor reference
            const pn = edge.routingPoints[rpCount - 1];
            targetAnchor = target.getTranslatedAnchor(pn, edge.parent, edge, edge.targetAnchorCorrection);
        } else {
            // Use the target center as start anchor reference
            const startRef = center(target.bounds);
            sourceAnchor = source.getTranslatedAnchor(startRef, target.parent, edge, edge.sourceAnchorCorrection);
            // Use the source center as end anchor reference
            const endRef = center(source.bounds);
            targetAnchor = target.getTranslatedAnchor(endRef, source.parent, edge, edge.targetAnchorCorrection);
        }

        const result: RoutedPoint[] = [];
        result.push({ kind: 'source', x: sourceAnchor.x, y: sourceAnchor.y });
        for (let i = 0; i < rpCount; i++) {
            const p = edge.routingPoints[i];
            if (i > 0 && i < rpCount - 1
                || i === 0 && maxDistance(sourceAnchor, p) >= options.minimalPointDistance + (edge.sourceAnchorCorrection || 0)
                || i === rpCount - 1 && maxDistance(p, targetAnchor) >= options.minimalPointDistance + (edge.targetAnchorCorrection || 0)) {
                result.push({ kind: 'linear', x: p.x, y: p.y, pointIndex: i });
            }
        }
        result.push({ kind: 'target', x: targetAnchor.x, y: targetAnchor.y });
            return this.filterEditModeHandles(result, edge, options);
    }

    /**
     * Remove routed points that are in edit mode and for which the angle between the preceding and
     * following points falls below a threshold.
     */
    filterEditModeHandles(route: RoutedPoint[], edge: Routable, options: PolylineRouteOptions): RoutedPoint[] {
        if (edge.children.length === 0)
            return route;

        let i = 0;
        while (i < route.length) {
            const curr = route[i];
            if (curr.pointIndex !== undefined) {
                const handle: SRoutingHandle | undefined = edge.children.find(child =>
                    child instanceof SRoutingHandle && child.kind === 'junction' && child.pointIndex === curr.pointIndex) as any;
                if (handle !== undefined && handle.editMode && i > 0 && i < route.length - 1) {
                    const prev = route[i - 1], next = route[i + 1];
                    const prevDiff: Point = { x: prev.x - curr.x, y: prev.y - curr.y };
                    const nextDiff: Point = { x: next.x - curr.x, y: next.y - curr.y };
                    const angle = angleBetweenPoints(prevDiff, nextDiff);
                    if (Math.abs(Math.PI - angle) < options.removeAngleThreshold) {
                        route.splice(i, 1);
                        continue;
                    }
                }
            }
            i++;
        }
        return route;
    }

    createRoutingHandles(edge: Routable): void {
        const rpCount = edge.routingPoints.length;
        this.addHandle(edge, 'source', 'routing-point', -2);
        this.addHandle(edge, 'line', 'volatile-routing-point', -1);
        for (let i = 0; i < rpCount; i++) {
            this.addHandle(edge, 'junction', 'routing-point', i);
            this.addHandle(edge, 'line', 'volatile-routing-point', i);
        }
        this.addHandle(edge, 'target', 'routing-point', rpCount);
    }

    getInnerHandlePosition(edge: Routable, handle: SRoutingHandle) {
        if (handle.kind === 'line') {
            const { start, end } = this.findRouteSegment(edge, handle.pointIndex);
            if (start !== undefined && end !== undefined)
                return centerOfLine(start, end);
        }
        return undefined;
    }

    applyHandleMoves(edge: Routable, moves: ResolvedHandleMove[]) {
        moves.forEach(move => {
            const handle = move.handle;
            const points = edge.routingPoints;
            let index = handle.pointIndex;
            if (handle.kind === 'line') {
                // Upgrade to a proper routing point
                handle.kind = 'junction';
                handle.type = 'routing-point';
                points.splice(index + 1, 0, move.fromPosition || points[Math.max(index, 0)]);
                edge.children.forEach(child => {
                    if (child instanceof SRoutingHandle && (child === handle || child.pointIndex > index))
                        child.pointIndex++;
                });
                this.addHandle(edge, 'line', 'volatile-routing-point', index);
                this.addHandle(edge, 'line', 'volatile-routing-point', index + 1);
                index++;
            }
            if (index >= 0 && index < points.length) {
                points[index] = move.toPosition;
            }
        });
    }

    cleanupRoutingPoints(edge: Routable, routingPoints: Point[], updateHandles: boolean,
                         sourcePos?: Point, targetPos?: Point): void {
    }
}
