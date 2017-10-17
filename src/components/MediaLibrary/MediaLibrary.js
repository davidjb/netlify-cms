import React from 'react';
import { connect } from 'react-redux';
import { orderBy, get, last, isEmpty } from 'lodash';
import { Button, BrowseButton } from 'react-toolbox/lib/button';
import fuzzy from 'fuzzy';
import Dialog from '../UI/Dialog';
import { resolvePath } from '../../lib/pathHelper';
import { changeDraftField } from '../../actions/entries';
import {
  loadMedia as loadMediaAction,
  persistMedia as persistMediaAction,
  deleteMedia as deleteMediaAction,
  insertMedia as insertMediaAction,
  closeMediaLibrary as closeMediaLibraryAction,
} from '../../actions/mediaLibrary';
import MediaLibraryTable from './MediaLibraryTable';
import styles from './MediaLibrary.css';

const MEDIA_LIBRARY_SORT_KEY = 'cms.medlib-sort';
const DEFAULT_SORT = [{ fieldName: 'name', direction: 'asc' }];
const IMAGE_EXTENSIONS = [ 'jpg', 'jpeg', 'webp', 'gif', 'png', 'bmp', 'svg', 'tiff' ];

class MediaLibrary extends React.Component {

  state = {
    selectedFile: {},
    query: '',
    sortFields: JSON.parse(localStorage.getItem(MEDIA_LIBRARY_SORT_KEY)) || DEFAULT_SORT,
  };

  componentDidMount() {
    this.props.loadMedia({ query: this.state.query });
  }

  componentWillReceiveProps(nextProps) {
    const isOpening = !this.props.isVisible && nextProps.isVisible;
    if (isOpening) {
      this.setState({ selectedFile: {}, query: '' });
    }
  }

  filterImages = files => {
    return files ? files.filter(file => IMAGE_EXTENSIONS.includes(last(file.name.split('.')))) : [];
  };

  toTableData = files => {
    const tableData = files && files.map(({ id, name, size, queryOrder, url, urlIsPublicPath }) => {
      const ext = last(name.split('.'));
      return {
        id,
        name,
        type: ext.toUpperCase(),
        size,
        queryOrder,
        url,
        urlIsPublicPath,
        isImage: IMAGE_EXTENSIONS.includes(ext),
      };
    });
    const sort = this.getSort(this.state.sortFields);
    return orderBy(tableData, ...sort);
  };

  getSort = sortFields => {
    const sort = sortFields.reduce((acc, { fieldName, direction }) => {
      acc[0].push(fieldName);
      acc[1].push(direction);
      return acc;
    }, [[], []]);

    /**
     * The `queryOrder` field set on the file during media library search is
     * always the lowest priority order. Has no effect if no query has been
     * entered.
     */
    sort[0].push('queryOrder');
    sort[1].push('asc');

    return sort;
  };

  handleClose = () => {
    this.props.closeMediaLibrary();
  };

  handleRowSelect = row => {
    const selectedFile = this.state.selectedFile.id === row.id ? {} : row;
    this.setState({ selectedFile });
  };

  handleSortClick = fieldName => {
    const { sortFields } = this.state;
    const currentSort = sortFields.find(sort => sort.fieldName === fieldName) || {};
    const { direction } = currentSort;
    const shouldSort = !direction || direction === 'asc';
    const newSortField = shouldSort && { fieldName, direction: !direction ? 'asc' : 'desc' };
    const remainingSorts = sortFields.filter(sort => sort.fieldName !== fieldName);
    const newSort = shouldSort ? [newSortField, ...remainingSorts] : remainingSorts;
    localStorage.setItem(MEDIA_LIBRARY_SORT_KEY, JSON.stringify(newSort));
    this.setState({ sortFields: newSort });
  }

  getSortDirection = fieldName => {
    const { sortFields } = this.state;
    const sort = sortFields.find(sort => sort.fieldName === fieldName);
    const direction = get(sort, 'direction');
    if (direction === 'asc') return 'desc';
    if (direction === 'desc') return 'asc';
  };

  handlePersist = event => {
    event.stopPropagation();
    event.preventDefault();
    const { loadMedia, persistMedia, privateUpload } = this.props;
    const { files: fileList } = event.dataTransfer || event.target;
    const files = [...fileList];
    const file = files[0];
    return persistMedia(file, privateUpload)
      .then(() => loadMedia({ query: this.state.query }));
  };

  handleInsert = () => {
    const { selectedFile } = this.state;
    const { name, url, urlIsPublicPath } = selectedFile;
    const { insertMedia, publicFolder } = this.props;
    const publicPath = urlIsPublicPath ? url : resolvePath(name, publicFolder);
    insertMedia(publicPath);
    this.handleClose();
  };

  handleDelete = () => {
    const { selectedFile } = this.state;
    const { files, deleteMedia } = this.props;
    if (!window.confirm('Are you sure you want to delete selected media?')) {
      return;
    }
    const file = files.find(file => selectedFile.id === file.id);
    deleteMedia(file)
      .then(() => {
        this.setState({ selectedFile: {} });
      });
  };

  handleSearchKeyDown = (event, dynamicSearch) => {
    if (event.key === 'Enter' && dynamicSearch) {
      this.props.loadMedia({ query: this.state.query });
    }
  };

  handleSearchChange = event => {
    this.setState({ query: event.target.value });
  };

  queryFilter = (query, files) => {
    /**
     * Because file names don't have spaces, typing a space eliminates all
     * potential matches, so we strip them all out internally before running the
     * query.
     */
    const strippedQuery = query.replace(/ /g, '');
    const matches = fuzzy.filter(strippedQuery, files, { extract: file => file.name });
    const matchFiles = matches.map((match, queryIndex) => {
      const file = files[match.index];
      return { ...file, queryIndex };
    });
    return matchFiles;
  };

  handleRowFocus = event => {
    const scrollContainer = this.tableScrollRef.parentElement;
    const scrollContainerInnerHeight = scrollContainer.clientHeight;
    const scrollContainerBottomPadding = 130;
    const scrollElement = this.tableScrollRef;
    const scrollPosition = scrollElement.scrollTop;
    const row = event.currentTarget;
    const rowHeight = row.offsetHeight;
    const rowPosition = row.offsetTop;

    event.currentTarget.classList.add('mediaLibraryRowFocused');

    const rowAboveVisibleArea = scrollPosition > rowPosition;

    if (rowAboveVisibleArea) {
      scrollElement.scrollTop = rowPosition;
      return;
    }

    const effectiveScrollPosition = scrollContainerInnerHeight + scrollPosition;
    const effectiveRowPosition = rowPosition + rowHeight + scrollContainerBottomPadding;
    const rowBelowVisibleArea = effectiveScrollPosition < effectiveRowPosition;

    if (rowBelowVisibleArea) {
      const scrollTopOffset = scrollContainerInnerHeight - scrollContainerBottomPadding - rowHeight;
      scrollElement.scrollTop = rowPosition - scrollTopOffset;
    }
  };

  handleRowBlur = event => {
    event.currentTarget.classList.remove('mediaLibraryRowFocused');
  };

  render() {
    const { isVisible, canInsert, files, dynamicSearch, forImage, isLoading, isPersisting, isDeleting } = this.props;
    const { query, selectedFile } = this.state;
    const filteredFiles = forImage ? this.filterImages(files) : files;
    const queriedFiles = query && !dynamicSearch ? this.queryFilter(query, filteredFiles) : filteredFiles;
    const tableData = this.toTableData(queriedFiles);
    const hasFiles = files && !!files.length;
    const hasImages = filteredFiles && !!filteredFiles.length;
    const hasSearchResults = queriedFiles && !!queriedFiles.length;
    const hasMedia = hasSearchResults;
    const shouldShowProgressBar = isPersisting || isDeleting || isLoading;
    const loadingMessage = (isPersisting && 'Uploading...')
      || (isDeleting && 'Deleting...')
      || (isLoading && 'Loading...');
    const emptyMessage = (!hasFiles && 'No files found.')
      || (!hasImages && 'No images found.')
      || (!hasSearchResults && 'No results.');
    const footer =
      <div>
        <Button label="Delete" onClick={this.handleDelete} className={styles.buttonLeft} disabled={isEmpty(selectedFile) || !hasMedia} accent raised />
        <BrowseButton label="Upload" accept={forImage ? 'image/*' : '*'} onChange={this.handlePersist} className={styles.buttonLeft} primary raised />
        <Button label="Close" onClick={this.handleClose} className={styles.buttonRight} raised/>
        {
          !canInsert ? null :
            <Button label="Insert" onClick={this.handleInsert} className={styles.buttonRight} disabled={isEmpty(selectedFile) || !hasMedia} primary raised />
        }
      </div>;

    return (
      <Dialog
        isVisible={isVisible}
        isLoading={shouldShowProgressBar}
        loadingMessage={loadingMessage}
        onClose={this.handleClose}
        footer={footer}
      >
        <h1>{forImage ? 'Images' : 'Assets'}</h1>
        <input
          className={styles.searchInput}
          value={this.state.query}
          onChange={this.handleSearchChange}
          onKeyDown={event => this.handleSearchKeyDown(event, dynamicSearch)}
          placeholder="Search..."
          disabled={!hasFiles || !hasImages}
          autoFocus
        />
        <div style={{ height: '100%', paddingBottom: '130px' }}>
          <div style={{ height: '100%', overflowY: 'auto' }} ref={ref => this.tableScrollRef = ref}>
            <MediaLibraryTable
              data={tableData}
              selectedFile={this.state.selectedFile}
              hasMedia={hasMedia}
              onRowSelect={this.handleRowSelect}
              onRowFocus={this.handleRowFocus}
              onRowBlur={this.handleRowBlur}
              getSortDirection={this.getSortDirection}
              onSortClick={this.handleSortClick}
            />
            {hasMedia || shouldShowProgressBar ? null : <div style={{ height: '100%', width: '100%', position: 'absolute', top: '0', left: '0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><h1>{emptyMessage}</h1></div>}
          </div>
        </div>
      </Dialog>
    );
  }
}

const mapStateToProps = state => {
  const { config, mediaLibrary } = state;
  const configProps = {
    publicFolder: config.get('public_folder'),
  };
  const mediaLibraryProps = {
    isVisible: mediaLibrary.get('isVisible'),
    canInsert: mediaLibrary.get('canInsert'),
    files: mediaLibrary.get('files'),
    dynamicSearch: mediaLibrary.get('dynamicSearch'),
    forImage: mediaLibrary.get('forImage'),
    isLoading: mediaLibrary.get('isLoading'),
    isPersisting: mediaLibrary.get('isPersisting'),
    isDeleting: mediaLibrary.get('isDeleting'),
    privateUpload: mediaLibrary.get('privateUpload'),
  };
  return { ...configProps, ...mediaLibraryProps };
};

const mapDispatchToProps = {
  loadMedia: loadMediaAction,
  persistMedia: persistMediaAction,
  deleteMedia: deleteMediaAction,
  insertMedia: insertMediaAction,
  closeMediaLibrary: closeMediaLibraryAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(MediaLibrary);
