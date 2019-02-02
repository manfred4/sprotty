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

import { Point, Bounds, center } from "../../utils/geometry";
import { SParentElement } from "../../base/model/smodel";
import { Routable, SConnectableElement } from "./model";
import { translatePoint } from "../../base/model/smodel-utils";

export function getTranslatedAnchor(connectable: SConnectableElement, refPoint: Point, refContainer: SParentElement, edge: Routable, offset: number = 0): Point {
    const translatedRefPoint = translatePoint(refPoint, refContainer, connectable.parent);
    const anchor = computeRectangleAnchors(connectable.bounds, translatedRefPoint, offset);
    return translatePoint(anchor, connectable.parent, edge.parent);
}

export function computeRectangleAnchors(bounds: Bounds, refPoint: Point, offset: number): Point {
    if (refPoint.x >= bounds.x && bounds.x + bounds.width >= refPoint.x) {
        if (refPoint.y < bounds.y + 0.5 * bounds.height)
            return { x: refPoint.x, y: bounds.y };
        else
            return { x: refPoint.x, y: bounds.y + bounds.height };
    }
    if (refPoint.y >= bounds.y && bounds.y + bounds.height >= refPoint.y) {
        if (refPoint.x < bounds.x + 0.5 * bounds.width)
            return { x: bounds.x, y: refPoint.y };
        else
            return { x: bounds.x + bounds.width, y: refPoint.y };
    }
    return center(bounds);
}
