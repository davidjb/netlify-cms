import React from 'react';
import { capitalize } from 'lodash';
import { TableCell } from 'react-toolbox/lib/table';
import headCellTheme from './headCellTheme.css';

export default function MediaLibraryHeadCellHOC({ getSortDirection, onSortClick, hasMedia }) {
  return ({ name, sort }) => {
    const canSort = hasMedia && sort;
    const sorted = canSort && getSortDirection(name);

    return (
      <TableCell
        theme={headCellTheme}
        sorted={sorted}
        onClick={() => canSort && onSortClick(name)}
        style={canSort && { cursor: 'pointer' }}
      >
        {capitalize(name)}
      </TableCell>
    );
  };
}
