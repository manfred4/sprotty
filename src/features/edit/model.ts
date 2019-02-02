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

import { SChildElement, SModelElement } from '../../base/model/smodel';
import { SDanglingAnchor } from '../../graph/sgraph';
import { Hoverable, hoverFeedbackFeature } from '../hover/model';
import { moveFeature } from '../move/model';
import { isRoutable, Routable } from '../routing/model';
import { Selectable, selectFeature } from '../select/model';

export const editFeature = Symbol('editFeature');

export function canEditRouting(element: SModelElement): element is SModelElement & Routable {
    return isRoutable(element) && element.hasFeature(editFeature);
}

export type RoutingHandleKind = 'junction' | 'line' | 'source' | 'target' | 'mh-25' | 'mh-50' | 'mh-75';

export class SRoutingHandle extends SChildElement implements Selectable, Hoverable {
    /**
     * 'junction' is a point where two line segments meet,
     * 'line' is a volatile handle placed on a line segment,
     * 'source' and 'target' are the respective anchors.
     */
    kind: RoutingHandleKind;
    /** The actual routing point index (junction) or the previous point index (line). */
    pointIndex: number;
    /** Whether the routing point is being dragged. */
    editMode: boolean = false;

    hoverFeedback: boolean = false;
    selected: boolean = false;
    danglingAnchor?: SDanglingAnchor;

    hasFeature(feature: symbol): boolean {
        return feature === selectFeature || feature === moveFeature || feature === hoverFeedbackFeature;
    }
}
