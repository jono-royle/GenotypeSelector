export type Colour = 'blank' | 'green' | 'blue' | 'red';

export interface WellState {
  colour: Colour;
  note: string;
}

export const NEXT_COLOUR: Record<Colour, Colour> = {
  blank: 'green',
  green: 'blue',
  blue: 'red',
  red: 'blank',
};
