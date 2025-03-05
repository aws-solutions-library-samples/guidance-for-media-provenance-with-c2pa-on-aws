import { SelectProps } from "@cloudscape-design/components";
import { atom } from "jotai";

export const mainImageAtom = atom<SelectProps.Option | null>(null);
export const secondaryImageAtom = atom<SelectProps.Option | null>(null);
