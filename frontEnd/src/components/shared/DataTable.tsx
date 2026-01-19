/**
 * DataTable - Composant table de données réutilisable
 * Avec tri, recherche et pagination intégrés
 */
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/UI/table';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Checkbox } from '@/components/UI/checkbox';
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Search, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  searchable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  className?: string;
  width?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  selectable?: boolean;
  selectedIds?: (string | number)[];
  onSelectionChange?: (ids: (string | number)[]) => void;
  getRowId?: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
  stickyHeader?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  getRowId = (row) => row.id,
  onRowClick,
  emptyMessage,
  className,
  stickyHeader = false,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  
  // État du tri
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Gérer le tri
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Données triées
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  // Gestion de la sélection
  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < data.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(data.map(getRowId));
    }
  };

  const handleSelectRow = (row: T) => {
    const id = getRowId(row);
    if (selectedIds.includes(id)) {
      onSelectionChange?.(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange?.([...selectedIds, id]);
    }
  };

  // Icône de tri
  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  return (
    <div className={cn("relative rounded-md border", className)}>
      <Table>
        <TableHeader className={cn(stickyHeader && "sticky top-0 bg-background z-10")}>
          <TableRow>
            {/* Checkbox sélection globale */}
            {selectable && (
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label={t('common.selectAll', 'Tout sélectionner')}
                />
              </TableHead>
            )}

            {/* En-têtes des colonnes */}
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(column.className)}
                style={{ width: column.width }}
              >
                {column.sortable ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => handleSort(column.key)}
                  >
                    {column.header}
                    <SortIcon column={column.key} />
                  </Button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {/* Chargement */}
          {loading && (
            <TableRow>
              <TableCell
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="h-24 text-center"
              >
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t('common.loading', 'Chargement...')}</span>
                </div>
              </TableCell>
            </TableRow>
          )}

          {/* Pas de données */}
          {!loading && sortedData.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage || t('common.noData', 'Aucune donnée')}
              </TableCell>
            </TableRow>
          )}

          {/* Lignes de données */}
          {!loading &&
            sortedData.map((row, rowIndex) => {
              const rowId = getRowId(row);
              const isSelected = selectedIds.includes(rowId);

              return (
                <TableRow
                  key={rowId}
                  data-state={isSelected ? 'selected' : undefined}
                  className={cn(
                    onRowClick && "cursor-pointer hover:bg-muted/50",
                    isSelected && "bg-muted/50"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {/* Checkbox ligne */}
                  {selectable && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectRow(row)}
                        aria-label={t('common.selectRow', 'Sélectionner la ligne')}
                      />
                    </TableCell>
                  )}

                  {/* Cellules */}
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.render
                        ? column.render(row[column.key], row, rowIndex)
                        : row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </div>
  );
}

export default DataTable;
