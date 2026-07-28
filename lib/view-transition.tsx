"use client";

import * as React from "react";

type ViewTransitionClass =
  | string
  | { default: string; [transitionType: string]: string };

type ViewTransitionProps = {
  children: React.ReactNode;
  name?: string;
  default?: string;
  enter?: ViewTransitionClass;
  exit?: ViewTransitionClass;
  share?: ViewTransitionClass;
};

type ExperimentalReact = typeof React & {
  unstable_ViewTransition: React.ComponentType<ViewTransitionProps>;
  unstable_addTransitionType: (type: string) => void;
};

const experimentalReact = React as ExperimentalReact;

export const ViewTransition = experimentalReact.unstable_ViewTransition;
export const addTransitionType = experimentalReact.unstable_addTransitionType;
