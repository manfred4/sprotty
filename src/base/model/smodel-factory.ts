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

import { injectable, multiInject, optional, inject } from 'inversify';
import { TYPES } from "../types";
import { ProviderRegistry } from '../../utils/registry';
import {
    SChildElement, SModelElement, SModelElementSchema, SModelRoot, SModelRootSchema, SParentElement, isParent
} from './smodel';

/**
 * A model factory transforms a serializable model schema into the model representation that is used
 * internally by sprotty.
 */
export interface IModelFactory {
    createElement(schema: SModelElementSchema | SModelElement, parent?: SParentElement): SChildElement

    createRoot(schema: SModelRootSchema | SModelRoot): SModelRoot

    createSchema(element: SModelElement): SModelElementSchema
}

/**
 * The default model factory creates SModelRoot for the root element and SChildElement for all other
 * model elements.
 */
@injectable()
export class SModelFactory implements IModelFactory {

    constructor(@inject(TYPES.SModelRegistry) protected readonly registry: SModelRegistry) {
    }

    createElement(schema: SModelElementSchema | SModelElement, parent?: SParentElement): SChildElement {
        let child: SChildElement;
        if (this.registry.hasKey(schema.type)) {
            const regElement = this.registry.get(schema.type, undefined);
            if (!(regElement instanceof SChildElement))
                throw new Error(`Element with type ${schema.type} was expected to be an SChildElement.`);
            child = regElement;
        } else {
            child = new SChildElement();
        }
        return this.initializeChild(child, schema, parent);
    }

    createRoot(schema: SModelRootSchema | SModelRoot): SModelRoot {
        let root: SModelRoot;
        if (this.registry.hasKey(schema.type)) {
            const regElement = this.registry.get(schema.type, undefined);
            if (!(regElement instanceof SModelRoot))
                throw new Error(`Element with type ${schema.type} was expected to be an SModelRoot.`);
            root = regElement;
        } else {
            root = new SModelRoot();
        }
        return this.initializeRoot(root, schema);
    }

    createSchema(element: SModelElement): SModelElementSchema {
        const schema = {};
        for (const key in element) {
             if (!this.isReserved(element, key)) {
                const value: any = (element as any)[key];
                if (typeof value !== 'function')
                    (schema as any)[key] = value;
            }
        }
        if (element instanceof SParentElement)
            (schema as any)['children'] = element.children.map(child => this.createSchema(child));
        return schema as SModelElementSchema;
    }

    protected initializeElement(element: SModelElement, schema: SModelElementSchema | SModelElement): SModelElement {
        for (const key in schema) {
            if (!this.isReserved(element, key)) {
                const value: any = (schema as any)[key];
                if (typeof value !== 'function')
                    (element as any)[key] = value;
            }
        }
        return element;
    }

    protected isReserved(element: SModelElement, propertyName: string) {
        if (['children', 'parent', 'index'].indexOf(propertyName) >= 0)
            return true;
        let obj = element;
        do {
            const descriptor = Object.getOwnPropertyDescriptor(obj, propertyName);
            if (descriptor !== undefined)
                return descriptor.get !== undefined;
            obj = Object.getPrototypeOf(obj);
        } while (obj);
        return false;
    }

    protected initializeParent(parent: SParentElement, schema: SModelElementSchema | SParentElement): SParentElement {
        this.initializeElement(parent, schema);
        if (isParent(schema)) {
            (parent as any).children = schema.children.map(childSchema => this.createElement(childSchema, parent));
        }
        return parent;
    }

    protected initializeChild(child: SChildElement, schema: SModelElementSchema, parent?: SParentElement): SChildElement {
        this.initializeParent(child, schema);
        if (parent !== undefined) {
            (child as any).parent = parent;
        }
        return child;
    }

    protected initializeRoot(root: SModelRoot, schema: SModelRootSchema | SModelRoot): SModelRoot {
        this.initializeParent(root, schema);
        root.index.add(root);
        return root;
    }
}

export const EMPTY_ROOT: Readonly<SModelRootSchema> = Object.freeze({
    type: 'NONE',
    id: 'EMPTY'
});

/**
 * Used to bind a model element type to a class constructor in the SModelRegistry.
 */
export interface SModelElementRegistration {
    type: string
    constr: new () => SModelElement
}

/**
 * Model element classes registered here are considered automatically when constructring a model from its schema.
 */
@injectable()
export class SModelRegistry extends ProviderRegistry<SModelElement, void> {
    constructor(@multiInject(TYPES.SModelElementRegistration) @optional() registrations: SModelElementRegistration[]) {
        super();

        registrations.forEach(
            registration => this.register(registration.type, registration.constr)
        );
    }
}
