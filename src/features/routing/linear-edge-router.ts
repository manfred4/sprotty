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
import { SDanglingAnchor } from "../../graph/sgraph";
import { euclideanDistance, linear, Point } from "../../utils/geometry";
import { ResolvedHandleMove } from "../edit/edit-routing";
import { RoutingHandleKind, SRoutingHandle } from "../edit/model";
import { Routable } from "./model";
import { IEdgeRouter, RoutedPoint } from "./routing";

export interface LinearRouteOptions {
    minimalPointDistance: number;
}

@injectable()
export abstract class LinearEdgeRouter implements IEdgeRouter {
    abstract route(edge: Routable, options?: LinearRouteOptions): RoutedPoint[];

    abstract createRoutingHandles(edge: Routable): void;

    abstract applyHandleMoves(edge: Routable, moves: ResolvedHandleMove[]): void;

    abstract cleanupRoutingPoints(edge: Routable, routingPoints: Point[], updateHandles: boolean,
        sourcePos?: Point, targetPos?: Point): void;

    pointAt(edge: Routable, t: number): Point | undefined {
        const segments = this.calculateSegment(edge, t);
        if (!segments)
            return undefined;
        const { segmentStart, segmentEnd, lambda } = segments;
        return linear(segmentStart, segmentEnd, lambda);
    }

    derivativeAt(edge: Routable, t: number): Point | undefined {
        const segments = this.calculateSegment(edge, t);
        if (!segments)
            return undefined;
        const { segmentStart, segmentEnd } = segments;
        return {
            x: segmentEnd.x - segmentStart.x,
            y: segmentEnd.y - segmentStart.y
        };
    }

    protected calculateSegment(edge: Routable, t: number): { segmentStart: Point, segmentEnd: Point, lambda: number} | undefined {
        if (t < 0 || t > 1)
            return undefined;
        const routedPoints = this.route(edge);
        if (routedPoints.length < 2)
            return undefined;
        const segmentLengths: number[] = [];
        let totalLength = 0;
        for (let i = 0; i < routedPoints.length - 1; ++i) {
            segmentLengths[i] = euclideanDistance(routedPoints[i], routedPoints[i + 1]);
            totalLength += segmentLengths[i];
        }
        let currentLenght = 0;
        const tAsLenght = t * totalLength;
        for (let i = 0; i < routedPoints.length - 1; ++i) {
            const newLength = currentLenght + segmentLengths[i];
            // avoid division by (almost) zero
            if (segmentLengths[i] > 1E-8) {
                if (newLength >= tAsLenght) {
                    const lambda = Math.max(0, (tAsLenght - currentLenght)) / segmentLengths[i];
                    return {
                        segmentStart: routedPoints[i],
                        segmentEnd: routedPoints[i + 1],
                        lambda
                    };
                }
            }
            currentLenght = newLength;
        }
        return {
            segmentEnd: routedPoints.pop()!,
            segmentStart: routedPoints.pop()!,
            lambda: 1
        };
    }

    protected addHandle(edge: Routable, kind: RoutingHandleKind, type: string, routingPointIndex: number): SRoutingHandle {
        const handle = new SRoutingHandle();
        handle.kind = kind;
        handle.pointIndex = routingPointIndex;
        handle.type = type;
        edge.add(handle);
        return handle;
    }

    getHandlePosition(edge: Routable, handle: SRoutingHandle): Point | undefined {
        switch (handle.kind) {
            case 'source':
                if (edge.source instanceof SDanglingAnchor)
                    return edge.source.position;
                else
                    return this.route(edge)[0];
            case 'target':
                if (edge.target instanceof SDanglingAnchor)
                    return edge.target.position;
                 else {
                    const route = this.route(edge);
                    return route[route.length - 1];
                }
            default:
                const position = this.getInnerHandlePosition(edge, handle);
                if (position !== undefined)
                    return position;
                if (handle.pointIndex >= 0 && handle.pointIndex < edge.routingPoints.length)
                    return edge.routingPoints[handle.pointIndex];
        }
        return undefined;
    }

    protected abstract getInnerHandlePosition(edge: Routable, handle: SRoutingHandle): Point | undefined;

    protected findRouteSegment(edge: Routable, handleIndex: number): { start?: Point, end?: Point } {
        const getIndex = (rp: RoutedPoint) => {
            if (rp.pointIndex !== undefined)
                return rp.pointIndex;
            else if (rp.kind === 'target')
                return edge.routingPoints.length;
            else
                return -2;
        };
        const route = this.route(edge);
        let start, end: RoutedPoint | undefined;
        for (const rp of route) {
            const i = getIndex(rp);
            if (i <= handleIndex && (start === undefined || i > getIndex(start)))
                start = rp;
            if (i > handleIndex && (end === undefined || i < getIndex(end)))
                end = rp;
        }
        return { start, end };
    }
}
