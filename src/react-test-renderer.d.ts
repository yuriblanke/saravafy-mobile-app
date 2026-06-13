declare module "react-test-renderer" {
  import React from "react";

  export function create(
    element: React.ReactElement<any>,
    options?: { createNodeMock?: (element: React.ReactElement<any>) => any }
  ): ReactTestInstance;

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
  }

  export default {
    create,
    act,
  };
}
