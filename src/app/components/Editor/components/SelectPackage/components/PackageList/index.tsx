import { Button, message, Table, Tag } from "antd";
import "./styles.css";
import {
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import NodeManager from "../NodeManager";
import PackageDialog from "../PackageDialog";

interface Props {
  packages: Package[];
  selectedWorkspaceName: string;
  selectedWorkspaceLocation: string;
  setPackages: React.Dispatch<React.SetStateAction<Package[]>>;
}

function PackageList(props: Props) {
  const {
    packages,
    selectedWorkspaceName,
    selectedWorkspaceLocation,
    setPackages,
  } = props;
  const [packageName, setPackageName] = useState("");
  const [packageLocation, setPackageLocation] = useState("");
  const [packageType, setPackageType] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const ADD_PKG_TITLE = "Agregar un nuevo paquete";
  const columns = [
    {
      title: "Nombre del paquete",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Número de elementos",
      dataIndex: "numberOfItems",
      key: "numberOfItems",
    },
    {
      title: "Almacenamiento (mb)",
      dataIndex: "totalSize",
      key: "totalSize",
    },
    {
      title: "Tipo de paquete",
      dataIndex: "packageType",
      key: "packageType",
      render: (packageType: string) => (
        <Tag
          color={
            packageType === "cpp"
              ? "blue"
              : packageType === "python"
              ? "green"
              : "default"
          }
        >
          {packageType}
        </Tag>
      ),
    },
    {
      title: "Creado el",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt: string) => format(new Date(createdAt), "dd/MM/yyyy"),
    },
    {
      title: "Última modificación",
      dataIndex: "modifiedAt",
      key: "modifiedAt",
      render: (modifiedAt: string) => {
        const modifiedAtDate = new Date(modifiedAt);
        const now = new Date();
        const diffInDays = differenceInDays(now, modifiedAtDate);
        const diffInWeeks = Math.floor(diffInDays / 7);
        const diffInMonths = differenceInMonths(now, modifiedAtDate);
        const diffInYears = differenceInYears(now, modifiedAtDate);

        if (diffInDays < 7) {
          return format(modifiedAtDate, "EEEE, HH:mm", { locale: es });
        } else if (diffInDays < 30) {
          return `hace ${diffInWeeks} semanas, ${format(
            modifiedAtDate,
            "HH:mm",
            { locale: es }
          )}`;
        } else if (diffInYears === 0) {
          return `hace ${diffInMonths} meses, `;
        } else {
          return format(modifiedAtDate, "dd/MM/yyyy", { locale: es });
        }
      },
    },
    {
      title: "",
      dataIndex: "actionButtons",
      key: "actionButtons",
      width: 150,
      render: (_: unknown, pkg: Package) => (
        <div className="action-buttons">
          <Button
            type="default"
            color="blue"
            variant="outlined"
            onClick={() => {
              setPackageLocation(pkg.fullPath);
              setPackageName(pkg.name);
              setPackageType(pkg.packageType);
            }}
          >
            Editar
          </Button>
          <Button
            type="default"
            color="green"
            variant="outlined"
            onClick={() => handleBuildPackage(pkg.fullPath, pkg.name)}
          >
            Compilar
          </Button>
          <Button
            type="default"
            color="danger"
            variant="outlined"
            onClick={() => {
              handleDeletePackage(pkg.fullPath);
            }}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  async function handleDeletePackage(path: string) {
    try {
      const result = await window.electronAPI.deletePackage(path);

      if (result.deleted) {
        message.success("¡Package eliminado con éxito!");
        fetchPackages();
      } else if (result.error) {
        const errorMessage =
          typeof result.error === "string"
            ? result.error
            : JSON.stringify(result.error);
        message.error(`Error al eliminar el paquete: ${errorMessage}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        message.error(`¡Ocurrió un error al eliminar el paquete!`);
      }
    }
  }

  async function handleBuildPackage(path: string, name: string) {
    try {
      const result = await window.electronAPI.buildPackage(path, name);
      if (result.wasBuilded) {
        message.success("¡Package compilado con éxito!");
        fetchPackages();
      } else if (result.error) {
        const errorMessage =
          typeof result.error === "string"
            ? result.error
            : JSON.stringify(result.error);
        message.error(`Error al compilar el paquete: ${errorMessage}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        message.error(`¡Ocurrió un error al compilar el paquete!`);
      }
    }
  }

  const fetchPackages = async () => {
    const result = await window.electronAPI.getPackages(
      selectedWorkspaceLocation
    );
    setPackages(result);
  };

  return (
    <>
      {packageName && packageLocation && packageType ? (
        <NodeManager
          packageLocation={packageLocation}
          packageName={packageName}
          packageType={packageType}
          selectedWorkspaceLocation={selectedWorkspaceLocation}
          setPackageName={setPackageName}
          setPackageLocation={setPackageLocation}
        />
      ) : (
        <div className="package-list-container">
          <div className="package-list-header">
            <h1 className="package-name">{selectedWorkspaceName}</h1>
            <Button
              type="primary"
              color="geekblue"
              variant="solid"
              onClick={() => {
                setIsModalOpen(true);
              }}
            >
              {ADD_PKG_TITLE}
            </Button>
          </div>
          <Table dataSource={packages} columns={columns} />
          <PackageDialog
            packageLocation={selectedWorkspaceLocation}
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            setPackages={setPackages}
          />
        </div>
      )}
    </>
  );
}

export default PackageList;
