(function () {
  if (!window.CMS) return;

  CMS.registerPreviewStyle('/admin/preview.css');

  const h = window.h;
  const createClass = window.createClass;
  if (!h || !createClass) return;

  const getValue = (entry, path, fallback = '') => {
    const value = entry.getIn(['data'].concat(path));
    if (value === undefined || value === null) return fallback;
    return value;
  };

  const getAssetUrl = (props, value) => {
    if (!value) return '';
    const asset = props.getAsset(value);
    return asset && asset.toString ? asset.toString() : value;
  };

  const listToArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (value.toJS) return value.toJS();
    return [];
  };

  const text = (value, fallback = '') => value || fallback;

  const hero = (props, entry, type) => {
    const cover = getAssetUrl(props, getValue(entry, ['cover']));
    const title = getValue(entry, ['title'], 'Без названия');
    const subtitle = getValue(entry, ['subtitle']);

    return h('div', { className: 'ec-preview-hero' },
      cover ? h('img', { src: cover, alt: title }) : null,
      h('div', { className: 'ec-preview-hero-copy' },
        h('span', { className: 'ec-preview-kicker' }, type),
        h('h1', {}, title),
        subtitle ? h('p', { className: 'ec-preview-subtitle' }, subtitle) : null
      )
    );
  };

  const meta = (items) => h('ul', { className: 'ec-preview-meta' },
    items.filter(Boolean).map((item) => h('li', {}, item))
  );

  const gallery = (props, items, title) => {
    const images = listToArray(items)
      .map((item) => getAssetUrl(props, item && (item.image || item)))
      .filter(Boolean)
      .slice(0, 8);

    if (!images.length) return h('p', { className: 'ec-preview-empty' }, 'Фотографии пока не добавлены.');

    return h('div', { className: 'ec-preview-gallery' },
      images.map((src) => h('img', { src, alt: title || '' }))
    );
  };

  const CountryPreview = createClass({
    render() {
      const entry = this.props.entry;
      const body = this.props.widgetFor('body');
      return h('article', { className: 'ec-preview' },
        hero(this.props, entry, 'Направление'),
        meta([
          `Регион: ${text(getValue(entry, ['region']), 'не выбран')}`,
          getValue(entry, ['published']) === false ? 'Черновик' : 'Опубликовано',
          getValue(entry, ['featured']) === false ? 'Не на главной' : 'На главной'
        ]),
        h('section', { className: 'ec-preview-body' }, body),
        getValue(entry, ['why_body']) ? h('section', {},
          h('h2', {}, text(getValue(entry, ['why_title']), 'Зачем ехать?')),
          h('div', { className: 'ec-preview-body' }, this.props.widgetFor('why_body'))
        ) : null,
        getValue(entry, ['details_body']) ? h('section', {},
          h('h2', {}, text(getValue(entry, ['details_title']), 'Подробнее')),
          h('div', { className: 'ec-preview-body' }, this.props.widgetFor('details_body'))
        ) : null
      );
    }
  });

  const HotelPreview = createClass({
    render() {
      const entry = this.props.entry;
      const rooms = listToArray(getValue(entry, ['rooms']));
      return h('article', { className: 'ec-preview' },
        hero(this.props, entry, 'Отель'),
        meta([
          `Страна: ${text(getValue(entry, ['country']), 'не выбрана')}`,
          `Сегмент: ${listToArray(getValue(entry, ['segments'])).join(', ') || 'не выбран'}`,
          getValue(entry, ['published']) === false ? 'Черновик' : 'Опубликовано'
        ]),
        h('section', { className: 'ec-preview-body' }, this.props.widgetFor('body')),
        h('h2', {}, 'Номера и виллы'),
        rooms.length ? h('div', { className: 'ec-preview-grid' },
          rooms.slice(0, 6).map((room) => h('div', { className: 'ec-preview-card' },
            h('span', { className: 'ec-preview-label' }, room.type || room.area || 'Вариант размещения'),
            h('h3', {}, room.title || 'Без названия'),
            room.description ? h('p', {}, room.description) : null
          ))
        ) : h('p', { className: 'ec-preview-empty' }, 'Номера и виллы пока не добавлены.'),
        h('h2', {}, 'Галерея'),
        gallery(this.props, getValue(entry, ['gallery']), getValue(entry, ['title']))
      );
    }
  });

  const TourPreview = createClass({
    render() {
      const entry = this.props.entry;
      const facts = listToArray(getValue(entry, ['hero_facts']));
      const days = listToArray(getValue(entry, ['days']));
      return h('article', { className: 'ec-preview' },
        hero(this.props, entry, 'Тур'),
        meta([
          text(getValue(entry, ['destination']), 'Направление не выбрано'),
          text(getValue(entry, ['duration']), 'Длительность не указана'),
          getValue(entry, ['published']) === false ? 'Черновик' : 'Опубликовано'
        ]),
        facts.length ? h('div', { className: 'ec-preview-grid' },
          facts.map((fact) => h('div', { className: 'ec-preview-card' },
            h('span', { className: 'ec-preview-label' }, fact.label || 'Факт'),
            h('p', {}, fact.text || '')
          ))
        ) : null,
        h('section', { className: 'ec-preview-body' }, this.props.widgetFor('body')),
        h('h2', {}, 'Программа'),
        days.length ? h('div', { className: 'ec-preview-grid' },
          days.slice(0, 8).map((day) => h('div', { className: 'ec-preview-card' },
            h('h3', {}, day.title || 'День'),
            day.description ? h('p', {}, day.description) : null
          ))
        ) : h('p', { className: 'ec-preview-empty' }, 'Программа пока не добавлена.'),
        h('h2', {}, 'Галерея'),
        gallery(this.props, getValue(entry, ['gallery']), getValue(entry, ['title']))
      );
    }
  });

  CMS.registerPreviewTemplate('countries', CountryPreview);
  CMS.registerPreviewTemplate('hotels', HotelPreview);
  CMS.registerPreviewTemplate('tours', TourPreview);
})();
