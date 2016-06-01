import React, {PropTypes} from 'react';
import {connect}          from 'react-redux';
import _                  from 'lodash';
import moment             from 'moment';
import {
  ImageGroupHeader,
  ImagesToolbar
} from 'components/topics';
import {
  Images
} from 'components/items';
import {CircularProgress} from 'material-ui';
import {spaceUiActions}   from 'redux/modules/ui/space';
import {itemActions}      from 'redux/modules/context/item';
import {actions as context}   from 'redux/modules/context';
import {
  FileDropArea
} from 'components';
import {
  Log,
  FileUpload
} from 'helpers';
import {
  ImageService
} from 'services';

@connect(state => ({
  user:                     state.context.user,
  users:                    state.context.users,
  items:                    state.context.items,
  imagesBySpaceId:          state.context.imagesBySpaceId,
  sortedImages:             state.ui.sortedImages,
  sortImagesBy:             state.ui.sortImagesBy,
  location:                 state.routing.location
}))
export default class ImagesPerspective extends React.Component {
  static propTypes = {
    user:                   PropTypes.object.isRequired,
    users:                  PropTypes.object,
    space:                  PropTypes.object.isRequired,
    items:                  PropTypes.object,
    imagesBySpaceId:        PropTypes.object,
    dispatch:               PropTypes.func.isRequired,
    defaultSortBy:          PropTypes.string,
    sortedImages:           PropTypes.object,
    sortImagesBy:           PropTypes.object,
    location:               PropTypes.object
  };

  static defaultProps = {
    defaultSortBy:  'date', // date | tag | label | author
    sortedImages:   {},
    sortImagesBy:   {},
    filters:        {tags: ['info', 'tablet'], labels: ['ok', 'testing']},
    restriction:    {year: 2016, month: null},
    query:          null
  };

  constructor(props) {
    super(props);
    this.state = {
      filesUploading:     null,
      dragOver:           false,
      dragging:           false,
      selectable:         false,
      selectedImagesIds:  []
    };
  }

  componentWillMount() {
    const {query} = this.props.location;
    const {sortImagesBy, space} = this.props;
    if (sortImagesBy && sortImagesBy[space.id] && query.sort && query.sort !== sortImagesBy[this.props.space.id]) {
      this.sortChange(query.sort);
    }
  }

  componentWillReceiveProps(nextProps) {
    const {defaultSortBy, sortImagesBy, imagesBySpaceId} = this.props;

    const {space, items, imagesBySpaceId: nextImagesBySpaceId, sortImagesBy: nextSortImagesBy, users} = nextProps;
    const {query} = nextProps.location;

    if (!imagesBySpaceId || !imagesBySpaceId[space.id]) {
      this.props.dispatch(context.loadImages(space.id));
    }
    const currentSort = sortImagesBy[space.id] || defaultSortBy;
    let newSort = nextSortImagesBy[space.id] || defaultSortBy;
    const sortChanged = currentSort !== newSort;
    const firstSort = !nextSortImagesBy[space.id];
    const imagesChanged = imagesBySpaceId !== nextImagesBySpaceId;

    if ( (firstSort || sortChanged || imagesChanged || (_.size(query) > 0 && newSort !== query.sort)) && imagesBySpaceId && imagesBySpaceId[space.id]) {
      if ((_.size(query) > 0 && newSort !== query.sort)) {
        newSort = query.sort;
      }
      const sortedData = this.handleDataSort(space.id, newSort, nextImagesBySpaceId, items, users);
      this.props.dispatch(spaceUiActions.updateImagesOrder(space.id, newSort, sortedData));
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return !(_.isEqual(nextProps.sortedImages, this.props.sortedImages) && _.isEqual(nextState.selectedImagesIds, this.state.selectedImagesIds) && (nextState.selectable === this.state.selectable));
  }

  render() {
    const {query} = this.props.location;
    Log.debug('ImagesPerspective: render');
    const {dragOver, dragging} = this.state;
    const {space, items, sortedImages, sortImagesBy, defaultSortBy} = this.props;
    const imagesList = sortedImages[space.id] || {};
    const currentSort = sortImagesBy[space.id] || defaultSortBy;

    if (_.size(imagesList) === 0) {
      return (<div className='spinner'><CircularProgress mode='indeterminate' /></div>);
    }

    return (
        <FileDropArea multiple ref='imagesdrop' onDrop={this.filesDropped} onHoverEnter={this.hoverEntered} onHoverLeave={this.hoverLeft} onDragStart={this.dragStarted} onDragEnd={this.dragEnded}>
          <div>
            <div>
              <br />
              Drop here - over: {dragOver ? 'YES' : 'NO'} dragging: {dragging ? 'YES' : 'NO'}
              <br />
            </div>
            <ImagesToolbar activeSort={currentSort} onSortChange={this.sortChange} onSelectImages={this.selectImages} selectable={this.state.selectable} selectedImages={this.state.selectedImagesIds} unselectAllImages={this.unselectAllImages} query={query}/>
            {_.map(imagesList, (images, headline) => (
              this.imageGroupsRender(images, headline, items)
            ))}
          </div>
        </FileDropArea>
      );
  }

  imageGroupsRender = (images, headline, items) => {
    const key = headline.toLowerCase().replace(/ /g, '-');
    const imagesCollection = [];
    _.map(images, img => {
      imagesCollection.push(items[img.id]);
    });

    return (
        <div key={key}>
          <ImageGroupHeader headline={headline} />
          <Images images={imagesCollection} onSelectImage={this.selectImage} selectedImagesIds={this.state.selectedImagesIds} />
        </div>
      );
  };

  handleDataSort = (spaceId, sortBy, imagesBySpaceId, items, users) => {
    const imageIds = _.get(imagesBySpaceId, [spaceId, 'images']);
    let sortedData = [];

    _.map(imageIds, imageId => {
      const image = items[imageId];
      let sortValue, groupValue;
      switch (sortBy) {
        case 'date':
          sortValue = moment(image.created_at).unix();
          groupValue = moment(image.created_at).startOf('day').from(moment().startOf('day'));
          break;

        case 'author':
          sortValue = moment(image.created_at).unix();
          groupValue = users[image.owner_user_id].full_name;
          break;

        default:
          sortValue = imageId;
      }
      sortedData.push({id: imageId, sortValue: sortValue, groupValue: groupValue});
    });

    sortedData = _.sortBy(sortedData, ['sortValue']);
    sortedData = _.reverse(sortedData);
    sortedData = _.groupBy(sortedData, 'groupValue');

    if (sortBy === 'date') {
      // There is no today key in moment.fromNow so we need to inject it
      sortedData = JSON.stringify(sortedData).replace('a few seconds ago', 'today');
      sortedData = JSON.parse(sortedData);
    }

    if (sortBy === 'author') {
      // sort groups by author name
      const sortedGroupKeys = _.keys(sortedData).sort();
      const sortedGroupData = {};
      _.each(sortedGroupKeys, key => {
        sortedGroupData[key] = sortedData[key];
      });
      sortedData = sortedGroupData;
    }

    return sortedData;
  };

  // ----------------------------------
  // drag&drop + files upload
  // ----------------------------------
  hoverEntered = () => {
    this.setState({dragOver: true});
  };

  hoverLeft = () => {
    this.setState({dragOver: false});
  };

  dragStarted = () => {
    this.setState({dragging: true});
  };

  dragEnded = () => {
    this.setState({dragging: false});
  };

  upload = () => {
    // TODO: decoratedComponentInstance is a hack, but I don't have any more elegant way to access the selectFiles of the wrapped component as of now
    this.refs.imagesdrop.decoratedComponentInstance.selectFiles();
  };

  filesDropped = files => {
    const component = this;

    // const component = this;
    _.each(files, file => {
      Log.info('UPLOADING FILE: ', file);

      // 1. create temporary image entity
      ImageService.createRemoteImage(this.props.space.id, 'post', 'submit', file)
        .then(response => {
          // prepare uploader
          const uploader = new FileUpload({
            file,
            signedUrl: response.data.signed_put_url,
            onProgress: (percent, status) => {
              Log.debug('Happily uploading', percent, status);
              component.forceUpdate();
            },
            onAbort: () => {
              component.forceUpdate();
            }
          });

          // 2. add the image to the uploading list (include uploader for reference)
          component.setState({
            filesUploading: (component.state.filesUploading || []).concat(uploader)
          });

          // 3. start upload
          uploader.put()
            .then(() => {
              // 4a. add to attachments
              const item = response.data.item;
              item._file = uploader.file;

              const newImages = (component.state.images && _.clone(component.state.images)) || [];
              newImages.push(item);

              component.setState({
                filesUploading: _.without(component.state.filesUploading, uploader),
                images: newImages
              });

              // 4b. add to images
              component.props.dispatch(itemActions.addItem(item));

              // 4b. start postprocessing
              ImageService.postprocessImage(item.id);
            });
            // .catch(errorStr => {
            //   Log.error('Something went wrong with the upload:', errorStr);
            // });
        });
    });
  };

  sortChange = (newSort) => {
    const {space, sortImagesBy, defaultSortBy, dispatch} = this.props;
    const currentSort = sortImagesBy[space.id] || defaultSortBy;
    if (currentSort !== newSort) {
      dispatch(spaceUiActions.updateImagesSortBy(space.id, newSort));
    }
  };

  selectImages = () => {
    if (!this.state.selectable) {
      this.setState({selectable: true});
    }
  };

  unselectAllImages = () => {
    if (this.state.selectable) {
      this.setState({
        selectable: false,
        selectedImagesIds: []
      });
    }
  };

  selectImage = (e, imageId) => {
    if (this.state.selectable) {
      e.preventDefault();
      const selectedImagesIds = _.cloneDeep(this.state.selectedImagesIds);
      if (!_.includes(selectedImagesIds, imageId)) {
        selectedImagesIds.push(imageId);
      } else {
        const index = _.indexOf(selectedImagesIds, imageId);
        selectedImagesIds.splice(index, 1);
      }
      this.setState({'selectedImagesIds': selectedImagesIds});
    }
  };
}
