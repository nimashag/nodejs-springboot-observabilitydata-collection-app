declare module 'node-nlp' {
  export interface NlpManagerOptions {
    languages?: string[];
    forceNER?: boolean;
    [key: string]: any;
  }

  export interface ProcessResult {
    answer?: string;
    intent?: string;
    score?: number;
    [key: string]: any;
  }

  export class NlpManager {
    constructor(options?: NlpManagerOptions);
    addDocument(language: string, utterance: string, intent: string): void;
    addAnswer(language: string, intent: string, answer: string): void;
    train(): Promise<void>;
    process(language: string, utterance: string): Promise<ProcessResult>;
    [key: string]: any;
  }
}

