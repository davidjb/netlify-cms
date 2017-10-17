import React from 'react';
import bytes from 'bytes';
import { Table, TableHead, TableRow, TableCell } from 'react-toolbox/lib/table';
import MediaLibraryHeadCellHOC from './MediaLibraryHeadCellHOC';
import styles from './MediaLibrary.css';

export default class MediaLibraryTable extends React.Component {
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

    const HeadCell = MediaLibraryHeadCellHOC({ getSortDirection, onSortClick, hasMedia });
    return (
      <Table onRowSelect={idx => onRowSelect(data[idx])}>
        <TableHead>
          <HeadCell name="image"/>
          <HeadCell name="name" sort/>
          <HeadCell name="type" sort/>
          <HeadCell name="size" sort/>
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
