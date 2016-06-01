import React, {PropTypes} from 'react';
import {Image}            from 'components/items';
import _                  from 'lodash';

const Images = (props) => {
  const {images, onSelectImage, selectedImagesIds} = props;
  const imagesBlock = _.map(images, image => (
    <Image key={image.id} image={image} thumb='b' onSelectImage={onSelectImage} selectedImagesIds={selectedImagesIds} />
  ));

  return (
      <div style={{paddingBottom: 24}}>
        {imagesBlock}
      </div>
    );
};

Images.propTypes = {
  images:             PropTypes.array,
  onSelectImage:      PropTypes.func,
  selectedImagesIds:  PropTypes.array
};

export default Images;
