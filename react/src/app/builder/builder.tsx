import { IgrAvatar, IgrAvatarModule, IgrList, IgrListItem, IgrListModule } from 'igniteui-react';
import { useEffect, useRef, useState } from 'react';
import styles from './builder.module.css';
import createClassTransformer from '../style-utils';
import { RevealViewOptions, VisualizationViewerOptions, SavingArgs, MenuOpeningArgs } from 'reveal-sdk-wrappers';
import { RvRevealView, RvRevealViewRef, RvVisualizationViewer } from 'reveal-sdk-wrappers-react';
import { RdashDocument } from '@revealbi/dom';

declare var $: any;

IgrAvatarModule.register();
IgrListModule.register();

export interface VisualizationChartInfo {
  dashboardFileName: string;
  dashboardTitle: string;
  vizId: string;
  vizTitle: string;
  vizChartType: string;
  selected: any;
}

export default function Builder() {
  const classes = createClassTransformer(styles);
  const uuid = () => crypto.randomUUID();
  const [visualizationId, setVisualizationId] = useState<string | undefined>();
  const [dashboardFileName, setDashboardFileName] = useState<string | undefined>();
  const [dashboardTitle, setDashboardTitle] = useState<string | undefined>();
  const [dashboardDocument, setDashboardDocument] = useState<RdashDocument | null>(null);
  const [selectedVisualizations, setSelectedVisualizations] = useState<VisualizationChartInfo[]>([]);
  const [sourceDocs, setSourceDocs] = useState(new Map());
  const [localVisualizationChartInfo, setLocalVisualizationChartInfo] = useState<VisualizationChartInfo[]>([]);
  const rvRef = useRef<RvRevealViewRef>(null);

  //const BASE_URL = "https://localhost:7219";
  const BASE_URL = "https://acmeanalyticsserver.azurewebsites.net/";


  const dashboardDocumentRef = useRef(dashboardDocument);
  dashboardDocumentRef.current = dashboardDocument;

  $.ig.RevealSdkSettings.setBaseUrl(BASE_URL);

  const singleVizOptions: VisualizationViewerOptions = {};
  const dashboardOptions: RevealViewOptions = {
    canEdit: true,
    canSaveAs: true,
    startInEditMode: true,
    dataSourceDialog: {
      showExistingDataSources: true,
    },
    header: {
      menu: {
        showMenu: true,
        exportToExcel: false,
        exportToPdf: false,
        exportToPowerPoint: false,
        exportToImage: false,
        refresh: false,
        items: [
          {
            icon: `https://raw.githubusercontent.com/FortAwesome/Font-Awesome/refs/heads/6.x/svgs/regular/circle-check.svg`, // `${BASE_URL}/images/not-empty.svg`,
            title: "Clear / Reset",
            click: () => resetDashboard(),
          },
        ],
      },
    },
  };

  // Fetch visualization data
  const getVisualizationChartInfoList = async (): Promise<VisualizationChartInfo[]> => {
    try {
      const response = await fetch(`${BASE_URL}/dashboards/visualizations`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching visualization chart info list:", error);
      return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const visualizations = await getVisualizationChartInfoList();
      setLocalVisualizationChartInfo(visualizations);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (dashboardFileName) {
      console.log("Dashboard file name updated:", dashboardFileName);
    }
  }, [dashboardFileName]);

  const addVisualization = (
    viz: VisualizationChartInfo,
    event: React.MouseEvent<SVGSVGElement, MouseEvent>
  ) => {
    event.stopPropagation();
    const exists = selectedVisualizations.some(
      (selectedViz) =>
        selectedViz.vizId === viz.vizId && selectedViz.dashboardFileName === viz.dashboardFileName
    );
    if (exists) {
      alert("Visualization already in dashboard");
      return;
    }
    setSelectedVisualizations((prev) => [
      ...prev,
      { ...viz, selected: true },
    ]);
  };

  useEffect(() => {
    if (selectedVisualizations.length > 0) {
      generateDashboard();
    }
  }, [selectedVisualizations]);

  const generateDashboard = async () => {
    const document = new RdashDocument("Generated Dashboard");
    for (const viz of selectedVisualizations) {
      let sourceDoc = sourceDocs.get(viz.dashboardFileName);
      if (!sourceDoc) {
        try {
          sourceDoc = await RdashDocument.load(viz.dashboardFileName);
          setSourceDocs((prev) => new Map(prev).set(viz.dashboardFileName, sourceDoc));
        } catch (error) {
          console.error(`Failed to load document: ${viz.dashboardFileName}`, error);
          continue;
        }
      }
      if (sourceDoc) {
        document.import(sourceDoc, viz.vizId);
      }
    }
    if (JSON.stringify(document) !== JSON.stringify(dashboardDocumentRef.current)) {
      setDashboardDocument(document);
    }
  };

  const resetDashboard = () => {
    setSelectedVisualizations([]);
    setDashboardDocument(null);
  };

  const isDuplicateName = async (name: string) => {
    try {
      const response = await fetch(`${BASE_URL}/dashboards/${name}/exists`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error("Error checking duplicate name:", error);
      return false;
    }
  };

  const toggleSelected = (selectedItem: VisualizationChartInfo) => {
    setLocalVisualizationChartInfo((prevItems) =>
      prevItems.map((item) => ({
        ...item,
        selected:
          item.vizId === selectedItem.vizId &&
          item.vizTitle === selectedItem.vizTitle &&
          item.vizChartType === selectedItem.vizChartType &&
          item.dashboardTitle === selectedItem.dashboardTitle &&
          item.dashboardFileName === selectedItem.dashboardFileName,
      }))
    );
  };
  
  const saveDashboard = async (e: SavingArgs) => {
    const isInvalidName = (name: string) => {
      const invalidNames = ["generated dashboard", "new dashboard", ""];
      return invalidNames.includes(name.trim().toLowerCase());
    };

    let duplicate = await isDuplicateName(e.name);

    if (duplicate && !window.confirm(`A dashboard with name: ${e.name} already exists. Do you want to override it?`)) {
      return;
    }

    if (e.saveAs || isInvalidName(e.name)) {
      let newName: string | null = null;

      do {
        newName = window.prompt("Please enter a valid dashboard name");
        if (newName === null) {
          return;
        }

        duplicate = await isDuplicateName(newName);

        if (duplicate) {
          alert(`A dashboard with name: ${newName} already exists. Please enter a different name.`);
        } else if (isInvalidName(newName)) {
          alert("The name is not allowed. Please choose a different name.");
        }
      } while (isInvalidName(newName) || duplicate);
      e.dashboardId = e.name = newName;
    }

    e.saveFinished();
    resetDashboard();
    setTimeout(async () => {
      const updatedVisualizations = await getVisualizationChartInfoList();
      setLocalVisualizationChartInfo(updatedVisualizations);
    }, 2000);
  };

  const menuOpening = (args: MenuOpeningArgs) => {
    if (args.visualization) {
      args.menuItems[6].isHidden = true; 
      const newDeleteButton = new $.ig.RVMenuItem("Delete", "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/refs/heads/6.x/svgs/regular/trash-can.svg", () => {      
        // Remove the visualization from selectedVisualizations so generateDashboard won't re-add it
        setSelectedVisualizations((prev) =>
          prev.filter((viz) => viz.vizId !== args.visualization.id)
        );
        // Also remove the widget from the currently displayed dashboard
        (rvRef.current as any)?._revealView._dashboardView.deleteWidgetFromDashboard(args.visualization._widgetModel);
      });
      args.menuItems.push(newDeleteButton);
    }
  }

  return (
    <>
      <div className={classes("row-layout builder-container")}>
        <div className={classes("column-layout group")}>
          <div className={classes("row-layout group_1")}>
            <IgrList className={classes("list")}>
              {localVisualizationChartInfo.map((item) => (
                <div
                  style={{ display: "contents" }}
                  onClick={() => setVisualizationId(item.vizId)}
                  key={uuid()}
                >
                  <IgrListItem
                    key={item.vizId}
                    selected={item.selected ? true : undefined}
                    onClick={() => {
                      setDashboardFileName(item.dashboardFileName);
                      setDashboardTitle(item.dashboardTitle);
                      toggleSelected(item);
                    }}
                  >
                    <div slot="start" key={uuid()}>
                      <IgrAvatar
                        shape="circle"
                        className={classes("avatar")}
                        style={{
                          backgroundImage: `url('${BASE_URL}/images/png/${item.vizChartType}.png')`,
                          backgroundSize: "cover",
                        }}
                        key={uuid()}
                      ></IgrAvatar>
                    </div>
                    <div slot="title" key={uuid()}>
                      {item.vizTitle}
                    </div>
                    <div slot="subtitle" key={uuid()}>
                      {item.dashboardTitle}
                    </div>
                    <span
                      slot="end"
                      onClick={(event: any) => {
                        event.stopPropagation();
                        addVisualization(item, event);
                        setDashboardFileName(item.dashboardFileName);
                        setDashboardTitle(item.dashboardTitle);
                        toggleSelected(item);
                      }}
                      className={classes("material-icons icon")}
                      key={uuid()}
                    >
                      <span key={uuid()}>add_photo_alternate</span>
                    </span>
                  </IgrListItem>
                </div>
              ))}
            </IgrList>
          </div>
          <div className={classes("group_2")}>
            <RvVisualizationViewer
              dashboard={dashboardFileName!}
              visualization={visualizationId!}
              options={singleVizOptions}
            ></RvVisualizationViewer>
          </div>
        </div>
        <div className={classes("column-layout group_3")}>
          <div className={classes("row-layout group_4")}>
            <div className={classes("group_2")}>
              <RvRevealView ref={rvRef} 
                dashboard={dashboardDocument}
                options={dashboardOptions}
                saving={saveDashboard}
                menuOpening={menuOpening}
              ></RvRevealView>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
