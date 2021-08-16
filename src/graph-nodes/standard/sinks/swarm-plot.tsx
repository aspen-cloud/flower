import ResizableNode from "../../../components/resizable-node";
import { registerNode, ValueTypes } from "../../../node-type-manager";

import { ResponsiveSwarmPlot } from "@nivo/swarmplot";
import { Column } from "../../../types";
import { useMemo } from "react";

const SwarmPlot = registerNode({
  inputs: {
    table: ValueTypes.TABLE,
  },
  sources: {
    groupBy: ValueTypes.STRING,
    primaryDimension: ValueTypes.STRING,
    secondaryDimension: ValueTypes.STRING,
  },
  Component: ({ data: { inputs, sources, metadata }, id, selected }) => {
    const { size } = metadata;

    const chartData = useMemo(() => {
      if (
        !sources.groupBy.value ||
        !sources.primaryDimension.value ||
        !sources.secondaryDimension.value
      ) {
        return {
          chartData: [],
          groups: {
            label: "",
            values: [],
          },
        };
      }
      const groupCol = inputs.table.columns.find(
        (col) => col.accessor === sources.groupBy.value,
      );
      const groupValues = new Set<string>();
      const dataPoints = inputs.table.rows.map((row, i) => {
        const groupValue = row[groupCol.accessor];
        groupValues.add(groupValue.underlyingValue);
        return {
          id: i,
          group: groupValue.underlyingValue,
          [sources.primaryDimension.value]:
            row[sources.primaryDimension.value].underlyingValue,
          [sources.secondaryDimension.value]:
            row[sources.secondaryDimension.value].underlyingValue,
        };
      });

      return {
        chartData: dataPoints,
        groups: {
          label: groupCol.Header,
          values: Array.from(groupValues.values()),
        },
      };
    }, [
      inputs.table,
      sources.groupBy.value,
      sources.primaryDimension.value,
      sources.secondaryDimension.value,
    ]);

    const columnOptions = useMemo(
      () => [
        <option disabled selected value={""}>
          {" "}
          -- select a column --{" "}
        </option>,
        ...inputs.table.columns.map((c) => (
          <option value={c.accessor}>{c.Header}</option>
        )),
      ],
      [inputs.table.columns],
    );

    const primaryCol = useMemo(() => {
      return inputs.table.columns.find(
        (col) => col.accessor === sources.primaryDimension.value,
      );
    }, [sources.primaryDimension.value, inputs.table.columns]);

    const secondaryCol = useMemo(() => {
      return inputs.table.columns.find(
        (col) => col.accessor === sources.secondaryDimension.value,
      );
    }, [sources.secondaryDimension.value, inputs.table.columns]);

    const shouldRender: boolean =
      !!inputs.table &&
      !!sources.groupBy.value &&
      !!primaryCol &&
      !!secondaryCol;

    return (
      <ResizableNode
        label="Swarm Plot"
        sources={inputs}
        height={size?.height || 200}
        width={size?.width || 400}
        nodeId={id}
        className={`${selected ? "nowheel" : ""}`}
      >
        <div>
          <div>
            <label>
              Group By
              <select
                value={sources.groupBy.value}
                onChange={(e) => sources.groupBy.set(e.target.value)}
              >
                {columnOptions}
              </select>
            </label>
            <label>
              Primary Measure
              <select
                value={sources.primaryDimension.value}
                onChange={(e) => sources.primaryDimension.set(e.target.value)}
              >
                {columnOptions}
              </select>
            </label>
            <label>
              Secondary Measure
              <select
                value={sources.secondaryDimension.value}
                onChange={(e) => sources.secondaryDimension.set(e.target.value)}
              >
                {columnOptions}
              </select>
            </label>
          </div>
          <div style={{ width: "600px", height: "400px" }}>
            {shouldRender ? (
              <SwarmPlotChart
                data={chartData.chartData}
                groups={chartData.groups}
                primaryCol={primaryCol}
                secondaryCol={secondaryCol}
              />
            ) : (
              <div>Select all dimensions to load chart</div>
            )}
          </div>
        </div>
      </ResizableNode>
    );
  },
});

function SwarmPlotChart({
  data,
  groups,
  primaryCol,
  secondaryCol,
}: {
  data: any[];
  groups: { label: string; values: string[] };
  primaryCol: Column;
  secondaryCol: Column;
}) {
  return (
    <ResponsiveSwarmPlot
      data={data}
      groups={groups.values}
      identity="id"
      value={primaryCol.accessor}
      valueFormat="$.2f"
      valueScale={{ type: "linear", min: 30000, max: 600000, reverse: false }}
      size={{
        key: secondaryCol.accessor,
        values: [5000, 25000],
        sizes: [6, 20],
      }}
      forceStrength={4}
      simulationIterations={100}
      borderColor={{
        from: "color",
        modifiers: [
          ["darker", 0.6],
          ["opacity", 0.5],
        ],
      }}
      width={600}
      height={400}
      margin={{ top: 80, right: 100, bottom: 80, left: 100 }}
      axisTop={{
        // @ts-ignore
        orient: "top",
        tickSize: 10,
        tickPadding: 5,
        tickRotation: 0,
        legend: groups.label,
        legendPosition: "middle",
        legendOffset: -46,
      }}
      axisRight={{
        // @ts-ignore
        orient: "right",
        tickSize: 10,
        tickPadding: 5,
        tickRotation: 0,
        legend: primaryCol.Header,
        legendPosition: "middle",
        legendOffset: 76,
      }}
      axisBottom={{
        // @ts-ignore
        orient: "bottom",
        tickSize: 10,
        tickPadding: 5,
        tickRotation: 0,
        legend: `Size indicates ${secondaryCol.Header}`,
        legendPosition: "middle",
        legendOffset: 46,
      }}
      axisLeft={{
        // @ts-ignore
        orient: "LEFT",
        tickSize: 10,
        tickPadding: 5,
        tickRotation: 0,
        legend: primaryCol.Header,
        legendPosition: "middle",
        legendOffset: -76,
      }}
    />
  );
}

export default SwarmPlot;
