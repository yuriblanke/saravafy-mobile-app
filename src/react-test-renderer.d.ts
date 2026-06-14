declare module "react-test-renderer" {
  import React from "react";

  export interface ReactTestRenderer {
    root: ReactTestInstance;
    unmount(): void;
    update(element: React.ReactElement<any>): void;
  }

  export function create(
    element: React.ReactElement<any>,
    options?: { createNodeMock?: (element: React.ReactElement<any>) => any }
  ): ReactTestRenderer;

  export function act(
    callback: () => void | PromiseLike<void>
  ): Promise<void>;

  export interface ReactTestInstance {
    children: Array<ReactTestInstance | string>;
    instance: any;
    props: any;
    root: ReactTestInstance;
    type: string | React.ComponentType<any>;
    parent: ReactTestInstance | null;
    unmount(): void;
    update(element: React.ReactElement<any>): void;
    findByProps(props: any): ReactTestInstance;
    findAllByType(type: React.ComponentType<any> | string): ReactTestInstance[];
    findByType(type: React.ComponentType<any> | string): ReactTestInstance;
  }

  export default {
    create,
    act,
  };
}
