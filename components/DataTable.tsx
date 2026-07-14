import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const DataTable = <T,>({
  columns,
  data,
  rowKey,
  tableClassName,
  headerRowClassName,
  headerCellClassName,
  bodyRowClassName,
  bodyCellClassName,
  headerClassName,
}: DataTableProps<T>) => {
  return (
    <div>
      <Table className={cn("custom-scrollbar", tableClassName)}>
        <TableHeader className={headerClassName}>
          <TableRow className={cn("hover:bg-transparent!", headerRowClassName)}>
            {columns.map((column, index) => (
              <TableHead
                key={index}
                className={cn(
                  "bg-dark-400 text-purple-100 py-4 first:pl-5 last:pr-5"
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow
              key={rowKey(row, rowIndex)}
              className={cn(
                "overflow-hidden rounded-lg border-b border-purple-100/5 hover:bg-dark-400/3! relative",
                bodyRowClassName
              )}
            >
              {columns.map((column, columnIndex) => (
                <TableCell
                  key={columnIndex}
                  className={cn("py-4 first:pl-5 last:pr-5")}
                >
                  {column.cell(row, rowIndex)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DataTable;
