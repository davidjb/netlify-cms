import React from 'react';
import bytes from 'bytes';
import { Table, TableHead, TableRow, TableCell } from 'react-toolbox/lib/table';
import headCellTheme from './headCellTheme.css';
import styles from './MediaLibrary.css';

export default class MediaLibraryTable extends React.Component {
  /**
   * Because React Toolbox requires a specific hierarchy in it's nested
   * components, we use this prop getter instead of wrapping `TableCell` in
   * an HOC, as wrapping `TableCell` stops React Toolbox from processing the
   * table cell.
   */
  getHeadCellProps(name, opts = {}) {
    const { sort = true, style = {} } = opts;
    const { hasMedia, getSortDirection, onSortClick } = this.props;
    const canSort = hasMedia && sort;
    const cursor = canSort ? 'pointer' : 'auto';
    return {
      theme: headCellTheme,
      sorted: canSort ? getSortDirection(name) : null,
      onClick: () => canSort && onSortClick(name),
      style: { ...style, cursor },
    };
  }

  render () {
    const {
      data,
      selectedFile,
      hasMedia,
      onRowSelect,
      onRowFocus,
      onRowBlur,
      getSortDirection,
      onSortClick,
    } = this.props;

    return (
      <Table onRowSelect={idx => onRowSelect(data[idx])}>
        <TableHead>
          <TableCell { ...this.getHeadCellProps('image', { sort: false, style: { width: '92px' } }) }>
            Image
          </TableCell>
          <TableCell { ...this.getHeadCellProps('name') }>Name</TableCell>
          <TableCell { ...this.getHeadCellProps('type') }>Type</TableCell>
          <TableCell { ...this.getHeadCellProps('size') }>Size</TableCell>
        </TableHead>
        {
          data.map((file, idx) =>
            <TableRow
              key={idx}
              selected={selectedFile.id === file.id }
              onFocus={onRowFocus}
              onBlur={onRowBlur}
            >
              <TableCell>
                {
                  !file.isImage ? null :
                    <a href={file.url} target="_blank" tabIndex="-1">
                      <img src={file.url} className={styles.thumbnail}/>
                    </a>
                }
              </TableCell>
              <TableCell>{file.name}</TableCell>
              <TableCell>{file.type}</TableCell>
              <TableCell>{bytes(file.size, { decimalPlaces: 0 })}</TableCell>
            </TableRow>
          )
        }
      </Table>
    );
  }
}
