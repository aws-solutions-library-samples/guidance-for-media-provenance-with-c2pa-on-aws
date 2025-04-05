import {
  getProperties,
  uploadData,
  getUrl,
  remove,
  copy,
  list,
} from "aws-amplify/storage";

import { useMutation, useQuery } from "@tanstack/react-query";
import { SelectProps } from "@cloudscape-design/components";
import { createFMP4Manifest, createManifest, convertMP4ToFMP4 } from "../graphql/mutations";
import { generateClient } from "aws-amplify/api";

const client = generateClient();

interface IUseRemoveFiles {
  filePaths: string[];
}
export const useRemoveFiles = (refetch: () => void) => {
  return useMutation({
    mutationKey: ["useRemoveFiles"],
    mutationFn: async ({ filePaths }: IUseRemoveFiles) => {
      return await Promise.all(
        filePaths.map(
          async (filePath: string) => await remove({ path: filePath })
        )
      );
    },
    onSuccess: refetch,
  });
};

export const useListAssets = (path: string) => {
  return useQuery({
    queryKey: [`useListAssets${path}`],
    queryFn: async () => {
      return await list({
        path,
        options: {
          subpathStrategy: {
            strategy: "exclude",
          },
        },
      });
    },
  });
};

interface IUseGetAssetMutate {
  path: string;
}
export const useGetAssetMutate = () => {
  return useMutation({
    mutationKey: ["useGetAssetMutate"],
    mutationFn: async ({ path }: IUseGetAssetMutate) => {
      return await getUrl({ path });
    },
  });
};

export const useGetAsset = (path: string) => {
  return useQuery({
    queryKey: [`useGetAsset-${path}`],
    queryFn: async () => {
      return await getUrl({ path, options: { validateObjectExistence: true } });
    },
  });
};

export const useGetAssetAsFileObject = (path: string) => {
  return useQuery({
    queryKey: [`useGetAssetAsFileObject-${path}`],
    queryFn: async () => {
      const { url } = await getUrl({
        path,
        options: { validateObjectExistence: true },
      });

      const result = await fetch(url.href);
      const blob = await result.blob();
      const file = new File([blob], path.split("/").pop()!, {
        type: blob.type,
      });

      return file;
    },
  });
};

export const useGetFileProperties = (path: string) => {
  return useQuery({
    queryKey: [`useGetFileProperties-${path}`],
    queryFn: async () => {
      return await getProperties({ path });
    },
  });
};

export const useCreateNewManifest = () => {
  return useMutation({
    mutationKey: ["useCreateNewManifest"],
    mutationFn: async ({
      newTitle,
      file,
      assertions,
      ingredients,
      ...params
    }: // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any) => {
      const uuid = new Date().toUTCString();

      const fileUpload = await uploadData({
        path: `editedAssets/${uuid}/${newTitle}`,
        data: file,
      }).result;

      const jsonUpload = await uploadData({
        path: `editedAssets/${uuid}/${newTitle}.json`,
        data: JSON.stringify(
          [
            {
              label: "c2pa.actions",
              data: {
                actions: assertions,
              },
            },
          ],
          null,
          2
        ),
      }).result;

      const ingredientsUpload = await Promise.all(
        ingredients.map(async (item: SelectProps.Option, index: number) => {
          const result = await copy({
            source: {
              path: item.value!,
            },
            destination: {
              path: `editedAssets/${uuid}/ingredient-${index}/${item.label}`,
            },
          });
          return result.path;
        })
      );

      const { data } = await client.graphql({
        query: createManifest,
        variables: {
          input: {
            newTitle,
            imageS3: fileUpload.path,
            jsonS3: jsonUpload.path,
            ingredientsUpload,
            ...params,
          },
        },
      });

      return JSON.parse(data.createManifest);
    },
  });
};

interface IUseCreateNewFMP4Manifest {
  newTitle: string;
  computeType: string;
  initFile: string;
  manifestFile: string;
  fragmentsPattern: string;
}
export const useCreateNewFMP4Manifest = () => {
  return useMutation({
    mutationFn: async ({
      newTitle,
      computeType,
      initFile,
      manifestFile,
      fragmentsPattern,
    }: IUseCreateNewFMP4Manifest) => {
      const { data } = await client.graphql({
        query: createFMP4Manifest,
        variables: {
          input: {
            newTitle,
            computeType,
            initFile,
            manifestFile,
            fragmentsPattern,
          },
        },
      });

      return JSON.parse(data.createFMP4Manifest);
    },
  });
}

interface IUseConvertMP4ToFMP4 {
  newTitle: string;
  mp4File: File;
}

export const useConvertMP4ToFMP4 = () => {
  return useMutation({
    mutationFn: async ({
      newTitle,
      mp4File,
    }: IUseConvertMP4ToFMP4) => {
      // Convert the file to base64 for direct upload through GraphQL
      const fileReader = new FileReader();
      const fileBase64Promise = new Promise<string>((resolve, reject) => {
        fileReader.onload = () => {
          const base64 = fileReader.result?.toString().split(',')[1];
          if (base64) {
            resolve(base64);
          } else {
            reject(new Error('Failed to convert file to base64'));
          }
        };
        fileReader.onerror = () => reject(fileReader.error);
        fileReader.readAsDataURL(mp4File);
      });
      
      const fileBase64 = await fileBase64Promise;
      
      // Call the GraphQL mutation to convert the MP4 file to fragmented MP4
      const { data } = await client.graphql({
        query: convertMP4ToFMP4,
        variables: {
          input: {
            newTitle,
            mp4FileName: mp4File.name,
            mp4FileType: mp4File.type || 'video/mp4',
            mp4FileBase64: fileBase64,
          },
        },
      });

      return JSON.parse(data.convertMP4ToFMP4);
    },
  });
};
