import React, {PropTypes} from 'react';
import _                  from 'lodash';
import {getPath as path}  from 'routes';
import classNames         from 'classnames/bind';
import {Link}             from 'react-router';
import {ImageHelper}      from 'helpers';
import styles							from './Image.scss';

const cx = classNames.bind(styles);

const Image = (props) => {
  const {image, onSelectImage, selectedImagesIds} = props;
  let {thumb} = props;

	if (thumb === 'c' && !_.includes(image.thumbsnails, 'l')) {
		thumb = ''; // fallback to original if large image is missing
	}

	const selectImage = (e) => {
    if (onSelectImage) {
      onSelectImage(e, image.id);
    }
  };

  return (
      <Link className={cx({image__link: true, selected: _.includes(selectedImagesIds, image.id)})} to={path('image', [image.id])} onClick={selectImage}>
        <img src={ImageHelper.postImageUrl(image.key, thumb)} className={styles.image} />
      </Link>
    );
};

Image.propTypes = {
  image: 					    PropTypes.object,
  thumb:  				    PropTypes.string,
  onSelectImage:      PropTypes.func,
  selectedImagesIds:  PropTypes.array
};

Image.defaultProps = {
	thumb:             'c',
  selectedImagesIds: []
};

export default Image;
