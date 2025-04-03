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
import { createFMP4Manifest, createManifest } from "../graphql/mutations";
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
      console.log("Listed assets: " + JSON.stringify(result));
      const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".mpd"];
      const ll = result.items.filter(asset => {
        const extension = asset.path.toLowerCase().split('.').pop();
        if(allowedExtensions.includes('.' + extension)) {
          console.log("Allowed asset: " + asset.path);
          return asset;
        }
      });
      console.log("Listed assets: " + JSON.stringify(ll));
      return {'items': ll};
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
};
