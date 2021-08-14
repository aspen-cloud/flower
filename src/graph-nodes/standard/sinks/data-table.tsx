import { Button, Collapse, Icon, InputGroup, Intent } from "@blueprintjs/core";
import { useMemo, useState } from "react";
import {
  useTable,
  usePagination,
  useSortBy,
  useAsyncDebounce,
  useGlobalFilter,
  useFilters,
  Column,
} from "react-table";
import { columnTypes } from "../../../column-parsers";
import { Table, Column as DataColumn } from "../../../types";
import { download, tableToCsv } from "../../../utils/files";
import filterDefinitions from "../transformers/filters";

const ROW_HEIGHT = "40px";

interface FilterInputValue {
  accessor: string;
  filterId: string;
  compareValue: string;
}

function FilterInput({
  columns,
  value,
  onChange,
}: {
  columns: DataColumn[];
  value: FilterInputValue;
  onChange: (newVal: FilterInputValue) => void;
}) {
  const columnOptions = useMemo(
    () => [
      <option disabled selected value={""}>
        {" "}
        -- select a column --{" "}
      </option>,
      ...columns.map((c) => <option value={c.accessor}>{c.Header}</option>),
    ],
    [columns],
  );

  return (
    <>
      <span className="bp3-html-select">
        <select
          value={value.accessor}
          onChange={(e) =>
            onChange({
              accessor: e.target.value,
              filterId: value.filterId,
              compareValue: value.compareValue,
            })
          }
        >
          {columnOptions}
        </select>
        <span className="bp3-icon bp3-icon-caret-down"></span>
      </span>
      <span className="bp3-html-select">
        <select
          value={value.filterId}
          onChange={(e) =>
            onChange({
              accessor: value.accessor,
              filterId: e.target.value,
              compareValue: value.compareValue,
            })
          }
        >
          {[
            <option disabled selected value={""}>
              {" "}
              -- select a filter --{" "}
            </option>,
            ...Object.keys(filterDefinitions).map((filter) => (
              <option key={filter}>{filter}</option>
            )),
          ]}
        </select>
        <span className="bp3-icon bp3-icon-caret-down"></span>
      </span>
      <input
        className="bp3-input"
        onChange={(e) =>
          onChange({
            accessor: value.accessor,
            filterId: value.filterId,
            compareValue: e.target.value,
          })
        }
        value={value.compareValue}
        placeholder="Compare"
      />
    </>
  );
}

interface DataTableProps {
  table: Table;
}

export default function DataTable({ table }: DataTableProps) {
  // Docs say to memoize these values
  const columnsMemo = useMemo<Column[]>(
    () =>
      (table.columns ?? []).map((c) => ({
        ...c,
        filter: (rows, columnIds, filterValue) => {
          const [columnId] = columnIds;
          // array of filters (filterid and copare value)
          return rows.filter((r) =>
            filterValue.every((filter) =>
              filterDefinitions[filter.filterId](
                r.original[columnId].underlyingValue,
                filter.compareValue,
              ),
            ),
          );
        },
        accessor: `${c.accessor}.readValue`,
        id: c.accessor,
      })),
    [table.columns],
  );
  const dataMemo = useMemo(() => table.rows ?? [], [table.rows]);

  const tableInstance = useTable(
    {
      columns: columnsMemo,
      data: dataMemo,
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination,
  );
  const [filterCollapseOpen, setFilterCollapseOpen] = useState(false);

  // TODO: Set up react plugin typing https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-table
  const {
    columns,
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    // @ts-ignore
    page,
    // @ts-ignore
    canPreviousPage,
    // @ts-ignore
    canNextPage,
    // @ts-ignore
    pageOptions,
    // @ts-ignore
    pageCount,
    // @ts-ignore
    gotoPage,
    // @ts-ignore
    nextPage,
    // @ts-ignore
    previousPage,
    // @ts-ignore
    setPageSize,
    // @ts-ignore
    state: { pageIndex, pageSize, globalFilter, filters },
    // @ts-ignore
    preGlobalFilteredRows,
    // @ts-ignore
    setGlobalFilter,
    // @ts-ignore
    setFilter,
  } = tableInstance;

  const filterCount = preGlobalFilteredRows.length;
  const [globalFilterInput, setGlobalFilterInput] = useState(globalFilter);
  const onGlobalFilterChange = useAsyncDebounce((value) => {
    setGlobalFilter(value || undefined);
  }, 200);

  const [filterAccessorInput, setFilterAccessorInput] = useState("");
  const [filterOperationInput, setFilterOperationInput] = useState("");
  const [filterCompareValueInput, setFilterCompareValueInput] = useState("");

  const filterInputs = useMemo(
    () =>
      filters.flatMap((columnFilters, i) => {
        return columnFilters.value.map((filter) => (
          <div style={{ margin: "2px 0" }}>
            <FilterInput
              key={i}
              columns={table.columns}
              value={{
                accessor: columnFilters.id,
                filterId: filter.filterId,
                compareValue: filter.compareValue,
              }}
              onChange={(newVal) => {
                const newFilter = {
                  compareValue: newVal.compareValue,
                  filterId: newVal.filterId,
                };
                if (newVal.accessor === columnFilters.id) {
                  setFilter(columnFilters.id, [
                    ...columnFilters.value.filter((f) => f !== filter),
                    newFilter,
                  ]);
                } else {
                  const newColFilters =
                    filters.find((f) => f.id === newVal.accessor) || [];

                  setFilter(
                    columnFilters.id,
                    columnFilters.value.filter((f) => f !== filter),
                  );
                  setFilter(newVal.accessor, [...newColFilters, newFilter]);
                }
              }}
            />
            <Button
              style={{ marginLeft: "2px" }}
              onClick={() => {
                setFilter(
                  columnFilters.id,
                  columnFilters.value.filter((f) => f !== filter),
                );
              }}
              icon="cross"
              intent={Intent.DANGER}
            />
          </div>
        ));
      }),
    [filters, setFilter, table.columns],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex" }}>
          <InputGroup
            leftIcon="search"
            value={globalFilterInput || ""}
            onChange={(e) => {
              setGlobalFilterInput(e.target.value);
              onGlobalFilterChange(e.target.value);
            }}
            placeholder={`${filterCount} records...`}
          />
        </div>
        <div>
          <Button
            onClick={() => {
              const table: Table = {
                columns: columns.map((c) => ({
                  accessor: c.id,
                  Header: c.Header.toString(),
                  //@ts-ignore
                  Type: c.Type as string,
                })),
                rows: preGlobalFilteredRows.map((r) => r.original),
              };
              download(tableToCsv(table), "flow-export.csv");
            }}
            rightIcon="export"
          >
            Export
          </Button>
        </div>
      </div>
      <div>
        <h3
          style={{
            color: "#5c7080",
          }}
          onClick={() => setFilterCollapseOpen((prev) => !prev)}
        >
          [{filterCollapseOpen ? "-" : "+"}] Filters{" "}
          {filters.count ? `(${filters.count})` : ""}
        </h3>
        <Collapse isOpen={filterCollapseOpen}>
          {filterInputs}
          {/* <FormGroup inline={true}> */}
          <h5>New Filter</h5>
          <FilterInput
            columns={table.columns}
            value={{
              accessor: filterAccessorInput,
              filterId: filterOperationInput,
              compareValue: filterCompareValueInput,
            }}
            onChange={(newVal) => {
              setFilterAccessorInput(newVal.accessor);
              setFilterOperationInput(newVal.filterId);
              setFilterCompareValueInput(newVal.compareValue);
            }}
          />
          <Button
            style={{ marginLeft: "2px", display: "inline" }}
            intent={Intent.PRIMARY}
            onClick={() => {
              const prevFilterValue =
                filters.find((f) => f.id === filterAccessorInput) || [];
              setFilter(filterAccessorInput, [
                ...prevFilterValue,
                {
                  compareValue: filterCompareValueInput,
                  filterId: filterOperationInput,
                },
              ]);
              setFilterAccessorInput("");
              setFilterOperationInput("");
              setFilterCompareValueInput("");
            }}
          >
            Add
          </Button>
        </Collapse>
      </div>
      <div style={{ flexGrow: 1, overflow: "auto" }}>
        {/* apply the table props */}
        <table
          {...getTableProps()}
          style={{
            border: "1px solid lightblue",
            borderRadius: "10px",
            padding: "10px",
            margin: "10px 0",
            backgroundColor: "white",
            width: "100%",
          }}
          cellSpacing="0"
        >
          <thead
            style={{
              padding: "10px",
            }}
          >
            {
              // Loop over the header rows
              headerGroups.map((headerGroup) => (
                // Apply the header row props
                <tr
                  {...headerGroup.getHeaderGroupProps()}
                  style={{ height: ROW_HEIGHT }}
                >
                  {
                    // Loop over the headers in each row
                    headerGroup.headers.map((column) => (
                      // Apply the header cell props
                      <th
                        {...column.getHeaderProps(
                          // @ts-ignore
                          column.getSortByToggleProps(),
                        )}
                        style={{
                          paddingRight: "20px",
                          textAlign: "left",
                          position: "sticky",
                          top: 0,
                          backgroundColor: "lightblue",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
                              <Icon
                                //@ts-ignore
                                icon={columnTypes[column.Type].icon}
                                style={{ marginRight: "0.5em" }}
                                iconSize={10}
                              />
                            </div>

                            {
                              // Render the header
                              column.render("Header")
                            }
                          </div>

                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            <Icon
                              icon={
                                //@ts-ignore
                                column.isSorted
                                  ? //@ts-ignore
                                    column.isSortedDesc
                                    ? "caret-down"
                                    : "caret-up"
                                  : "double-caret-vertical"
                              }
                              iconSize={10}
                            />
                          </div>
                        </div>
                      </th>
                    ))
                  }
                </tr>
              ))
            }
          </thead>
          {/* Apply the table body props */}
          <tbody {...getTableBodyProps()}>
            {
              // Loop over the table rows
              page.map((row) => {
                // Prepare the row for display
                prepareRow(row);
                return (
                  // Apply the row props
                  <tr {...row.getRowProps()} style={{ height: ROW_HEIGHT }}>
                    {
                      // Loop over the rows cells
                      row.cells.map((cell) => {
                        // Apply the cell props
                        return (
                          <td
                            {...cell.getCellProps()}
                            style={{
                              borderTop: "1px solid gray",
                              paddingRight: "20px",
                            }}
                          >
                            {
                              // Render the cell contents
                              cell.render("Cell")
                            }
                          </td>
                        );
                      })
                    }
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
      <div
        style={{
          margin: "4px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>
          <Button
            onClick={() => gotoPage(0)}
            disabled={!canPreviousPage}
            icon="double-chevron-left"
          />{" "}
          <Button
            onClick={() => previousPage()}
            disabled={!canPreviousPage}
            icon="chevron-left"
          />{" "}
          <Button
            onClick={() => nextPage()}
            disabled={!canNextPage}
            icon="chevron-right"
          />{" "}
          <Button
            onClick={() => gotoPage(pageCount - 1)}
            disabled={!canNextPage}
            icon="double-chevron-right"
          />{" "}
          <span>
            Page{" "}
            <strong>
              {pageIndex + 1} of {pageOptions.length}
            </strong>{" "}
          </span>
          <span>
            | Go to page:{" "}
            <input
              type="number"
              defaultValue={pageIndex + 1}
              onChange={(e) => {
                const page = e.target.value ? Number(e.target.value) - 1 : 0;
                gotoPage(page);
              }}
              style={{ width: "100px" }}
            />
          </span>
        </div>
        <div>
          <span>
            Displaying{" "}
            <strong>
              {pageIndex * pageSize + 1} -{" "}
              {Math.min((pageIndex + 1) * pageSize, filterCount)} of{" "}
              {filterCount}
            </strong>{" "}
          </span>
          |{" "}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
            }}
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
