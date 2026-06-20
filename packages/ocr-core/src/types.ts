export interface TextLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type OcrEngineMode = 'auto' | 'native' | 'tesseract';

export interface RecognizeTextOptions {
  engine: OcrEngineMode;
  languages: string[];
}

export interface ContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
