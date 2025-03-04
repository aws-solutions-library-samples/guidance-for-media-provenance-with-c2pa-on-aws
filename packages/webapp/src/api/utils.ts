import { useQuery } from "@tanstack/react-query";
import { Manifest, selectEditsAndActivity } from "c2pa";

export const useGetEditsAndActitivy = (selectedManifest: Manifest) => {
  return useQuery({
    queryKey: ["useGetEditsAndActitivy"],
    queryFn: async () => {
      return await selectEditsAndActivity(selectedManifest);
    },
  });
};
