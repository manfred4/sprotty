/********************************************************************************
 * Copyright (c) 2017-2018 TypeFox and others.
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
import { VNode } from "snabbdom/vnode";
import { SModelElement } from "../base/model/smodel";
import { IVNodeDecorator } from "../base/views/vnode-decorators";
import { setAttr } from "../base/views/vnode-utils";
import { EMPTY_DIMENSION, linear, Side, toDegrees, Point } from "../utils/geometry";
import { SEdge, SLabel, SLabelSchema } from "./sgraph";

export interface SEdgeLabelSchema extends SLabelSchema {
    placement?: EdgeLabelPlacement    
}

export class SEdgeLabel extends SLabel {
    placement?: EdgeLabelPlacement    
}

export type LabelSide = 'left' | 'right' | 'top' | 'bottom' | 'on';

export class EdgeLabelPlacement extends Object {
    /**
     * true, if the label should be rotated to touch the edge tangentially
     */
    rotate: boolean

    /**
     * where is the label relative to the line's direction
     */
    side: LabelSide

    /**
     * between 0 (source anchor) and 1 (target anchor)
     */
    position: number 

    /**
     * space between label and edge/connected nodes
     */
    offset: number 
}

export const DEFAULT_EDGE_LABEL_PLACEMENT: EdgeLabelPlacement = {
    rotate: true,
    side: 'top',
    position: 0.5,
    offset: 7
}

@injectable()
export class EdgeLabelPlacementDecorator implements IVNodeDecorator {
    decorate(vnode: VNode, element: SModelElement): VNode {
        if (element instanceof SEdgeLabel 
            && element.parent instanceof SEdge) {
            const label = element;
            if (label.size !== EMPTY_DIMENSION) {
                const placement = {...DEFAULT_EDGE_LABEL_PLACEMENT, ...element.placement}
                const edge = label.parent as SEdge;
                const position = Math.min(1, Math.max(0, placement.position));
                const pointOnEdge = edge.router.pointAt(edge, position);
                const derivativeOnEdge = edge.router.derivativeAt(edge, position);
                let transform = '';
                if (pointOnEdge && derivativeOnEdge) {
                    transform += `translate(${pointOnEdge.x}, ${pointOnEdge.y})`
                    let angle = toDegrees(Math.atan2(derivativeOnEdge.y, derivativeOnEdge.x));
                    if (placement.rotate) {
                        let flippedAngle = angle
                        if (Math.abs(angle) > 90) {
                             if (angle < 0)
                                flippedAngle += 180;
                            else if (angle > 0)
                                flippedAngle -= 180
                        }
                        transform += ` rotate(${flippedAngle})`
                        const alignment = this.getRotatedAlignment(label, placement, flippedAngle !== angle);
                        transform += ` translate(${alignment.x}, ${alignment.y})`;
                    } else {
                        const alignment = this.getAlignment(label, placement, angle);
                        transform += ` translate(${alignment.x}, ${alignment.y})`;
                    }
                    
                    setAttr(vnode, 'transform', transform)
                }
            }
        }
        return vnode;
    }

    protected getRotatedAlignment(label: SEdgeLabel, placement: EdgeLabelPlacement, flip: boolean) {
        if (placement.side === 'on') 
            return { x: -0.5 * label.size.height, y: 0.5 * label.size.height};
        let x = 0;
        let y = 0
        if (flip) {
            if (placement.position < 0.3333333) 
                x = - label.size.width - placement.offset;
            else if (placement.position < 0.6666666)
                x = 0.5 * label.size.width;
            else 
                x = placement.offset;
            switch (placement.side) {
                case 'left':
                case 'bottom':
                    y = label.size.height;
                    break;
                case 'right':
                case 'top':
                    y = - placement.offset;
            }
        } else {
            if (placement.position < 0.3333333) 
                x = placement.offset;
            else if (placement.position < 0.6666666)
                x = 0.5 * label.size.width;
            else 
                x = - label.size.width - placement.offset;
            switch (placement.side) {
                case 'right':
                case 'bottom':
                    y = label.size.height;
                    break;
                case 'left':
                case 'top':
                    y = - placement.offset;
            }
        }
        return { x, y };
    }

    protected getAlignment(label: SEdgeLabel, placement: EdgeLabelPlacement, angle: number): Point {
        if (placement.side === 'on') 
            return { x: -0.5 * label.size.height, y: 0.5 * label.size.height};
        const quadrant = this.getQuadrant(angle);
        const bounds = label.bounds;
        const midLeft = { x: placement.offset, y: 0.5 * bounds.height };
        const topLeft = { x: placement.offset, y: bounds.height };
        const topRight = { x: -bounds.width - placement.offset, y: bounds.height };
        const midRight = { x: -bounds.width - placement.offset, y: 0.5 * bounds.height }; 
        const bottomRight = { x: -bounds.width - placement.offset, y: -placement.offset}
        const bottomLeft = { x: placement.offset, y: -placement.offset }
        switch (placement.side) {
            case 'left': 
                switch (quadrant.side) {
                    case 'left':
                        return linear(topLeft, topRight, quadrant.position)
                    case 'top':
                        return linear(topRight, bottomRight, quadrant.position)
                    case 'right':
                        return linear(bottomRight, bottomLeft, quadrant.position)
                    case 'bottom':
                        return linear(bottomLeft, topLeft, quadrant.position)
                }
                case 'right':
                switch (quadrant.side) {
                    case 'left':
                        return linear(bottomRight, bottomLeft, quadrant.position)
                    case 'top':
                        return linear(bottomLeft, topLeft, quadrant.position)
                    case 'right':
                        return linear(topLeft, topRight, quadrant.position)
                    case 'bottom':
                        return linear(topRight, bottomRight, quadrant.position)
                }
            case 'top':
                switch (quadrant.side) {
                    case 'left':
                        return linear(bottomRight, bottomLeft, quadrant.position)
                    case 'top':
                        return this.linearFlip(bottomLeft, midLeft, midRight, bottomRight, quadrant.position)
                    case 'right':
                        return linear(bottomRight, bottomLeft, quadrant.position)
                    case 'bottom':
                        return this.linearFlip(bottomLeft, midLeft, midRight, bottomRight, quadrant.position)
                }
            case 'bottom':
                switch (quadrant.side) {
                    case 'left':
                        return linear(topLeft, topRight, quadrant.position)
                    case 'top':
                        return this.linearFlip(topRight, midRight, midLeft, topLeft, quadrant.position)
                    case 'right':
                        return linear(topLeft, topRight, quadrant.position)
                    case 'bottom':
                        return this.linearFlip(topRight, midRight, midLeft, topLeft, quadrant.position)
                }
        }
        return {x:0, y:0}
    }

    protected getQuadrant(angle: number): {side: Side, position: number} {
        if (Math.abs(angle) > 135) 
            return { side: 'left', position: (angle > 0 ? angle - 135 : angle + 225) / 90 }
        else if (angle < -45) 
            return { side: 'top', position: (angle + 135) / 90 }
        else if (angle < 45)
            return { side: 'right', position: (angle + 45) / 90 }
        else 
            return { side: 'bottom', position: (angle - 45) / 90 }
    }

    protected linearFlip(p0: Point, p1: Point, p2: Point, p3: Point, position: number) {
        return position < 0.5 ? linear(p0, p1, 2 * position) : linear(p2, p3, 2 * position - 1)
    }

    postUpdate(): void {}
}