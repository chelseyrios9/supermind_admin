"use client";
import SuperPowerForm from "@/Components/Superpower/ActionSuperpower/ActionSuperPowerForm";
import useCreate from "@/Utils/Hooks/useCreate";
import { useState } from "react";
import { ActionSuperpowerAPI } from "@/Utils/AxiosUtils/API";

const SuperPowerCreate = () => {
  const [resetKey, setResetKey] = useState(false);
  const { mutate, isLoading } = useCreate(ActionSuperpowerAPI, false, ActionSuperpowerAPI,false,
    (resDta) => {
      if (resDta?.status == 200 || resDta?.status == 201) {
        setResetKey(true);
      }
    }
  );
  return (
    <SuperPowerForm
      mutate={mutate}
      loading={isLoading}
      title={"AddSuperpower"}
      key={resetKey}
    />
  );
};

export default SuperPowerCreate;
