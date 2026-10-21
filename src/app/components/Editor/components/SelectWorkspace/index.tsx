import { Button, message, Result } from "antd";
import "./styles.css";
import WorkspaceDialog from "./components/WorkspaceDialog";
import { useState } from "react";

interface Props {
  setValidWorkspace: React.Dispatch<React.SetStateAction<boolean>>;
  setWorkspacePath: React.Dispatch<React.SetStateAction<string>>;
}

const TITLE =
  "¡Es necesario crear o abrir un workspace para continuar con la programación!";
const SUBTITLE =
  "El workspace es el lugar donde se almacenan los programas ROS, por eso es necesario tener un workspace para guardarlos";
const PRIMARY_BUTTON_TITLE = "Crear un nuevo workspace";
const SECONDARY_BUTTON_TITLE = "Abrir un workspace existente";

function SelectWorkspace(props: Props) {
  const { setValidWorkspace, setWorkspacePath } = props;
  const [openModal, setOpenModal] = useState(false);

  const handleOpenWorkspace = async () => {
    const result = await window.electronAPI.openWorkspaceLocation();
    const validateWorkspace = await window.electronAPI.validateWorkspace(
      result.workspaceLocation
    );

    if (!validateWorkspace.valid && !result.canceled) {
      message.error(
        "¡Ocurrió un error al seleccionar el workspace, la carpeta no es compatible!"
      );
    }
    setWorkspacePath(result.workspaceLocation);
    setValidWorkspace(validateWorkspace.valid);
  };

  return (
    <>
      <Result
        className="welcome-container"
        status="info"
        title={TITLE}
        subTitle={SUBTITLE}
        extra={[
          <>
            <Button
              type="primary"
              onClick={() => {
                setOpenModal(true);
              }}
            >
              {PRIMARY_BUTTON_TITLE}
            </Button>
            <Button onClick={handleOpenWorkspace}>
              {SECONDARY_BUTTON_TITLE}
            </Button>
            <WorkspaceDialog
              isModalOpen={openModal}
              setIsModalOpen={setOpenModal}
              setWorkspaceLocationFromCreationDialog={setWorkspacePath}
              setValidWorkspace={setValidWorkspace}
            />
          </>,
        ]}
      />
    </>
  );
}

export default SelectWorkspace;
