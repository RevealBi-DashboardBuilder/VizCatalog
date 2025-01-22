Below is a step-by-step developer guide explaining how to implement, run, and customize the **Builder** component you provided. This guide assumes you’re working in a standard React + TypeScript/JavaScript environment (e.g., Create React App, Vite, Next.js, etc.) and have basic knowledge of React hooks, npm, and Fetch APIs.

---

## 1. Overview

This **Builder** component allows you to:
1. Fetch available visualizations from a server (using a `BASE_URL`).
2. Display them in a list with a thumbnail/avatar icon.
3. Select and add those visualizations to a dynamic “Generated Dashboard.”
4. Use the Reveal SDK to:
   - Load, display, and edit the dashboard.
   - Provide a custom save flow (with name validation and overwrite checks).
   - Offer a context menu to remove visualizations.

By the end of this setup, you’ll be able to:
- Start the app.
- Fetch and display a list of visualizations.
- Dynamically build and save a new dashboard that contains one or more selected visualizations.

---

## 2. Dependencies & Installation

You will need to install the following (some might already be in your project):

1. **React and React DOM** (if not already installed)
2. **igniteui-react**: for the Ignite UI React components (Avatar, List, ListItem).
3. **reveal-sdk-wrappers** and **reveal-sdk-wrappers-react**: for the Reveal SDK components (`RvRevealView`, `RvRevealViewRef`, `RvVisualizationViewer`).
4. **@revealbi/dom**: for handling the `RdashDocument` class which is used to build and modify dashboards.

**Example** (using npm):
```bash
npm install react react-dom
npm install igniteui-react reveal-sdk-wrappers reveal-sdk-wrappers-react @revealbi/dom
```

If your environment doesn’t already have TypeScript definitions for React, you might also need:
```bash
npm install --save-dev @types/react @types/react-dom
```

---

## 3. Project Structure and File Placement

1. **Builder.tsx (or .jsx)**: Place your `Builder` component code in `src/components/Builder.tsx` (for instance).  
2. **styles**: The code references `builder.module.css` for scoped styles. Make sure you have a `builder.module.css` file in the same directory.  
3. **style-utils.ts** (or similar): The code references a local utility called `createClassTransformer`. This can be any CSS Modules helper function that merges class names.  
4. **Reveal config**: The snippet references the global variable `$.ig.RevealSdkSettings.setBaseUrl`. Ensure that your bundler/import system can handle referencing `$.ig` (i.e., the Reveal libraries might attach to a global `$` if you have jQuery; or ensure you’re importing it properly with the Reveal SDK instructions).

Here’s a minimal directory structure example:

```
src/
  components/
    Builder.tsx
    builder.module.css
    style-utils.ts
  App.tsx
  index.tsx
  ...
```

---

## 4. Step-by-Step Explanation of the Code

### 4.1 Imports
```tsx
import { IgrAvatar, IgrAvatarModule, IgrList, IgrListItem, IgrListModule } from 'igniteui-react';
import { useEffect, useRef, useState } from 'react';
import styles from './builder.module.css';
import createClassTransformer from '../style-utils';
import { RevealViewOptions, VisualizationViewerOptions, SavingArgs, MenuOpeningArgs } from 'reveal-sdk-wrappers';
import { RvRevealView, RvRevealViewRef, RvVisualizationViewer } from 'reveal-sdk-wrappers-react';
import { RdashDocument } from '@revealbi/dom';
```
- **IgrAvatar, IgrList**: Ignite UI React components for displaying items and avatars.
- **useEffect, useState, useRef**: React Hooks to manage state and references.
- **createClassTransformer**: A helper to bind the module-scoped CSS classes.
- **RevealViewOptions, VisualizationViewerOptions, etc.**: Types from Reveal SDK for customizing viewer behavior.
- **RvRevealView, RvVisualizationViewer**: React components that embed Reveal dashboards and single visualizations.
- **RdashDocument**: Represents a Reveal dashboard document; used to merge or import existing visualizations.

### 4.2 Module Registration
```tsx
IgrAvatarModule.register();
IgrListModule.register();
```
Registers Ignite UI React modules globally.

### 4.3 `VisualizationChartInfo` Interface
```ts
export interface VisualizationChartInfo {
  dashboardFileName: string;
  dashboardTitle: string;
  vizId: string;
  vizTitle: string;
  vizChartType: string;
  selected: any;
}
```
Describes the metadata for each visualization. Each `VisualizationChartInfo` item has:
- `dashboardFileName`: The source `.rdash` file for that visualization.
- `vizId`: Unique ID for the visualization.
- `vizTitle`: Display name.
- `vizChartType`: (e.g., a chart or gauge type).
- `selected`: Indicates if it’s currently selected.

### 4.4 The `Builder` Component
```tsx
export default function Builder() {
  const classes = createClassTransformer(styles);
  const uuid = () => crypto.randomUUID();
```
- **classes(...)** is a function that helps you pass `builder.module.css` classes to React components, ensuring no naming collisions.
- **uuid()** uses the Web Crypto API to generate random IDs for keys.

#### 4.4.1 State Declarations
```tsx
const [visualizationId, setVisualizationId] = useState<string | undefined>();
const [dashboardFileName, setDashboardFileName] = useState<string | undefined>();
const [dashboardTitle, setDashboardTitle] = useState<string | undefined>();
const [dashboardDocument, setDashboardDocument] = useState<RdashDocument | null>(null);
const [selectedVisualizations, setSelectedVisualizations] = useState<VisualizationChartInfo[]>([]);
const [sourceDocs, setSourceDocs] = useState(new Map());
const [localVisualizationChartInfo, setLocalVisualizationChartInfo] = useState<VisualizationChartInfo[]>([]);
const rvRef = useRef<RvRevealViewRef>(null);
```
1. **visualizationId** / **dashboardFileName** / **dashboardTitle**: Tracks the currently selected single visualization’s ID and associated dashboard file/title.
2. **dashboardDocument**: Holds the **entire** in-memory `RdashDocument` that is composed of multiple visualizations.
3. **selectedVisualizations**: Array of the user’s chosen visualizations (to be merged into one dashboard).
4. **sourceDocs**: A cache (Map) of loaded dashboards (`RdashDocument`) keyed by filename, so each .rdash file is only loaded once.
5. **localVisualizationChartInfo**: The full list of available visualizations from the server (populates the list).
6. **rvRef**: A ref to the Reveal View component (`RvRevealView`).

#### 4.4.2 Base URL and Initialization
```tsx
const BASE_URL = "https://acmeanalyticsserver.azurewebsites.net/";
```
Replace this with your server’s actual base URL.

```tsx
$.ig.RevealSdkSettings.setBaseUrl(BASE_URL);
```
Configures the Reveal SDK to use the server for data, exporting, etc.

#### 4.4.3 Reveal Options
```tsx
const singleVizOptions: VisualizationViewerOptions = {};
const dashboardOptions: RevealViewOptions = {
  canEdit: true,
  canSaveAs: true,
  startInEditMode: true,
  dataSourceDialog: { showExistingDataSources: true },
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
          icon: "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/refs/heads/6.x/svgs/regular/circle-check.svg",
          title: "Clear / Reset",
          click: () => resetDashboard(),
        },
      ],
    },
  },
};
```
- `singleVizOptions`: Configuration object for `RvVisualizationViewer` (the single visualization viewer on the right).
- `dashboardOptions`: Configuration for `RvRevealView` (the main reveal view on the bottom/right). 
  - `canEdit`, `canSaveAs`: Let you edit and save the embedded dashboard.
  - `startInEditMode`: The dashboard opens in edit mode.
  - `header.menu`: Additional or custom menu actions (like “Clear/Reset”).

#### 4.4.4 Fetching the Visualization List
```tsx
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
```
- Makes a GET request to `BASE_URL/dashboards/visualizations`.
- Returns an array of `VisualizationChartInfo`.

```tsx
useEffect(() => {
  const fetchData = async () => {
    const visualizations = await getVisualizationChartInfoList();
    setLocalVisualizationChartInfo(visualizations);
  };
  fetchData();
}, []);
```
- On mount, it immediately fetches available visualizations and stores them in `localVisualizationChartInfo`.

#### 4.4.5 Handling Visualization Selections
```tsx
const addVisualization = (viz: VisualizationChartInfo, event: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
  event.stopPropagation();
  const exists = selectedVisualizations.some(
    (selectedViz) =>
      selectedViz.vizId === viz.vizId && selectedViz.dashboardFileName === viz.dashboardFileName
  );
  if (exists) {
    alert("Visualization already in dashboard");
    return;
  }
  setSelectedVisualizations((prev) => [...prev, { ...viz, selected: true }]);
};
```
- **addVisualization**: Called when the user clicks the “add” icon. If the item is already in the array, it alerts the user; otherwise, it adds it.

```tsx
useEffect(() => {
  if (selectedVisualizations.length > 0) {
    generateDashboard();
  }
}, [selectedVisualizations]);
```
- Whenever a new visualization is added, `generateDashboard()` is triggered.

#### 4.4.6 Generating the Composite Dashboard
```tsx
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
  // Only update state if there's a real difference
  setDashboardDocument(document);
};
```
- Creates a new `RdashDocument` named “Generated Dashboard.”
- Iterates over each selected visualization:
  1. If the parent .rdash file hasn’t been loaded yet, load it from the server using `RdashDocument.load()`.
  2. Call `document.import()` to merge that visualization into the new dashboard.
- Finally, set `dashboardDocument` to the newly built `RdashDocument`.

#### 4.4.7 Resetting
```tsx
const resetDashboard = () => {
  setSelectedVisualizations([]);
  setDashboardDocument(null);
};
```
- Clears out selections and the displayed dashboard.

#### 4.4.8 Checking for Duplicate Names
```tsx
const isDuplicateName = async (name: string) => {
  try {
    const response = await fetch(`${BASE_URL}/dashboards/${name}/exists`);
    ...
    return responseData;
  } catch (error) {
    ...
  }
};
```
- Queries the server to see if a dashboard name already exists.

#### 4.4.9 Toggling the Selected Item
```tsx
const toggleSelected = (selectedItem: VisualizationChartInfo) => {
  setLocalVisualizationChartInfo((prevItems) =>
    prevItems.map((item) => ({
      ...item,
      selected:
        item.vizId === selectedItem.vizId &&
        item.vizTitle === selectedItem.vizTitle &&
        ...
    }))
  );
};
```
- Ensures only one item is “selected” in the list at a time.

#### 4.4.10 Saving the Dashboard
```tsx
const saveDashboard = async (e: SavingArgs) => {
  const isInvalidName = (name: string) => {
    const invalidNames = ["generated dashboard", "new dashboard", ""];
    return invalidNames.includes(name.trim().toLowerCase());
  };

  let duplicate = await isDuplicateName(e.name);

  if (duplicate && !window.confirm(`A dashboard with name: ${e.name} already exists. ...`)) {
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
        alert(`A dashboard with name: ${newName} already exists. ...`);
      } else if (isInvalidName(newName)) {
        alert("The name is not allowed. Please choose a different name.");
      }
    } while (isInvalidName(newName) || duplicate);
    e.dashboardId = e.name = newName;
  }

  e.saveFinished();
  resetDashboard();
  ...
};
```
- **saveDashboard** is fired by the Reveal SDK when the user clicks **Save** (or Save As):
  1. Checks if the name is invalid (matches or is blank).
  2. Checks with the server if a name already exists.
  3. If so, it confirms if the user wants to override or prompts for a new name.
  4. Calls `e.saveFinished()` to finalize the save flow in the Reveal SDK.
  5. Resets the dashboard and refreshes the visualization list (2-second delay).

#### 4.4.11 Menu Opening Event
```tsx
const menuOpening = (args: MenuOpeningArgs) => {
  if (args.visualization) {
    args.menuItems[6].isHidden = true;
    const newDeleteButton = new $.ig.RVMenuItem("Delete", "...", () => {
      setSelectedVisualizations((prev) =>
        prev.filter((viz) => viz.vizId !== args.visualization.id)
      );
      (rvRef.current as any)?._revealView._dashboardView.deleteWidgetFromDashboard(
        args.visualization._widgetModel
      );
    });
    args.menuItems.push(newDeleteButton);
  }
};
```
- Customizes the Reveal context menu:
  - Hides a certain default item.
  - Adds a **Delete** button that removes the widget from the dashboard and from the `selectedVisualizations` list.

---

## 5. Rendering the Component

Finally, the component’s JSX layout:

1. **Left Pane (List of Visualizations)**  
   A `IgrList` that displays each item with an avatar. Clicking on an item sets the single visualization preview to that item. Clicking on the “add” icon calls `addVisualization(...)`.

2. **Right Pane (Single Visualization Preview)**  
   Renders a `RvVisualizationViewer` if `visualizationId` is selected. Uses `singleVizOptions`.

3. **Bottom/Right Pane (Dashboard)**  
   Renders a `RvRevealView` using `dashboardDocument`. Provides full editing capabilities, saving, and custom context menus.

```tsx
return (
  <>
    <div className={classes("row-layout builder-container")}>
      {/* Left column with list and single viz preview */}
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
                    />
                  </div>
                  <div slot="title" key={uuid()}>{item.vizTitle}</div>
                  <div slot="subtitle" key={uuid()}>{item.dashboardTitle}</div>
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
          />
        </div>
      </div>

      {/* Right column with combined dashboard */}
      <div className={classes("column-layout group_3")}>
        <div className={classes("row-layout group_4")}>
          <div className={classes("group_2")}>
            <RvRevealView
              ref={rvRef}
              dashboard={dashboardDocument}
              options={dashboardOptions}
              saving={saveDashboard}
              menuOpening={menuOpening}
            />
          </div>
        </div>
      </div>
    </div>
  </>
);
```

---

## 6. How to Use and Run

1. **npm install** 
2. **npm start** 
6. **Start your development server** (Find the Server GitHub repo in this org).
7. **Interact** with the list of visualizations on the left:
   - Click an item to preview in the single visualization viewer (bottom left).
   - Click the “+” icon to add it to your generated dashboard.
8. **Save** the newly generated dashboard via the Reveal viewer’s built-in UI. 
9. **Delete** a widget from the newly generated dashboard using the context menu (“Delete”) button if needed.

---

## 7. Further Customization

- **BASE_URL**: Change to your own server URL. 
- **Styling**: Customize the `.css` in `builder.module.css`. The `classes(...)` function merges your classes with Ignite UI React’s styles. 
- **Data Fetching**: If your server endpoints differ from the example, just update the `fetch` calls accordingly.
- **Error Handling**: Currently, errors are logged with `console.error`; you might want to handle them more gracefully in production.
- **Performance**: If your dashboard or number of visualizations is large, consider adding pagination or virtualization to the list of items.
- **Menu Customization**: In `menuOpening()`, you can manipulate or hide any items and add custom logic for each visualization.

---

### Conclusion

With these steps, you’ll have a working Builder component in your React project. This lets you combine multiple visualizations from different `.rdash` files into one dynamic dashboard using Ignite UI components and the Reveal SDK. You can continue to expand on it, for instance by adding advanced filtering, theming, or more robust state management if your application grows.
