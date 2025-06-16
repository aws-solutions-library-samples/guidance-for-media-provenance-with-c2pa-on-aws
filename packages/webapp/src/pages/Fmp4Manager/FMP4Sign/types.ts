export type FormValues = {
  newTitle: string;
  computeType: "lambda" | "fargate";
  initFile: string;
  manifestFile: string;
  fragmentsPattern: string;
  folder: string;
};
