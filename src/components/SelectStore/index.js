import Select from "react-select";
// import SelectLoader from 'components/Loader/SelectLoader';
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { listStores } from "../../api";
import SelectLoader from "../SelectLoader";

export function SelectStores({
  value,
  onChange,
  isDisabled,
  isMulti = true,
  selectFirst = false,
  label,
  all = false,
}) {
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStores() {
      try {
        const stores = await listStores();
        updateStores(stores);
        setIsLoading(false);
      } catch (error) {
        toast.error("Ocorreu um erro ao listar as lojas!", {
          toastId: "stores",
        });
        setIsLoading(false);
      }
    }

    fetchStores();
  }, []);

  const updateStores = (stores) => {
    const mappedOptions = stores.map((store) => ({
      label: store.name,
      value: store.storeId || null,
    }));

    if (selectFirst || mappedOptions.length === 1) {
      onChange(mappedOptions[0]);
    }
    if (all) {
      if (mappedOptions.length > 1) {
        mappedOptions.unshift({ value: null, label: "Todas" });
      } else {
        mappedOptions.unshift({ value: null, label: "Nenhuma" });
      }
    }

    setOptions(mappedOptions);
  };

  if (isLoading) {
    return <SelectLoader />;
  }

  return (
    <div>
      {label && <label className="font-semibold">{label}</label>}
      <Select
        name="stores"
        className="my-2"
        value={value}
        options={options}
        onChange={(option) => {
          // lógica para impedir de selecionar uma loja junto com a opção de "Todas" em casos de multi-seleção
          if (isMulti && Array.isArray(option) && option.length > 1) {
            if (option[0].value === null) {
              onChange([option[1]]);
              return;
            }
            if (option[option.length - 1].value === null) {
              onChange([option.at(-1)]);
              return;
            }
          }

          // lógica para impedir de selecionar uma loja junto com a opção de "Nenhuma" em casos de multi-seleção
          if (isMulti && Array.isArray(option) && option.length > 1) {
            if (option[0].value === null) {
              onChange([option[1]]);
              return;
            }
            if (option[option.length - 1].value === null) {
              onChange([option.at(-1)]);
              return;
            }
          }

          onChange(option);
        }}
        styles={{
          valueContainer: (base) => ({
            ...base,
            cursor: "text",
            padding: "4px 8px",
          }),
          indicatorsContainer: (base) => ({
            ...base,
            cursor: "pointer",
          }),
          indicatorSeparator: () => ({ display: "none" }),
          multiValue: (base) => ({
            ...base,
            background:
              process.env.REACT_APP_SYSTEM_STYLE === "TEMDELIVERY"
                ? "#f25e5034"
                : "#312b4d34",
            border: "1px solid",
          }),
        }}
        theme={(theme) => ({
          ...theme,
          borderRadius: 6,
          borderColor:
            process.env.REACT_APP_SYSTEM_STYLE === "TEMDELIVERY"
              ? "#F25D50"
              : "#312b4d",
          colors: {
            ...theme.colors,
            primary50:
              process.env.REACT_APP_SYSTEM_STYLE === "TEMDELIVERY"
                ? "#f25d50b0"
                : "#312b4dB0",
            primary25:
              process.env.REACT_APP_SYSTEM_STYLE === "TEMDELIVERY"
                ? "#f25e5034"
                : "#312b4d34",
            primary:
              process.env.REACT_APP_SYSTEM_STYLE === "TEMDELIVERY"
                ? "#ee280c"
                : "#312b4d",
          },
        })}
        isDisabled={isDisabled}
        isMulti={isMulti}
        placeholder="Selecione..."
      />
    </div>
  );
}
