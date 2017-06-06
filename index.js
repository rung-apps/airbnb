import { create } from 'rung-sdk';
import { String as Text, Natural, OneOf } from 'rung-sdk/dist/types';
import Bluebird from 'bluebird';
import agent from 'superagent';
import promisifyAgent from 'superagent-promise';
import {
    map,
    join,
    repeat,
    isNil,
    mergeAll,
    cond,
    contains,
    always,
    T,
    __,
    merge,
    take
} from 'ramda';

const request = promisifyAgent(agent, Bluebird);
const clientId = '3092nxybyb0otqw18e8nh5nty';
const url = `https://api.airbnb.com/v2/search_results?client_id=${clientId}`;

const styles = {
    thumbnailArea: {
        float: 'left',
        width: '50px',
        marginLeft: '-10px',
        backgroundColor: '#ccc',
        position: 'absolute'
    },
    textArea: {
        float: 'right',
        width: '102px',
        marginRight: '-5px'
    },
    thumbnail: {
        width: '50px',
        height: '30px',
        backgroundSize: 'cover',
        backgroundPosition: 'bottom'
    }
};

function createAlert({ listing, pricing_quote }) {
    const {
        id,
        name,
        property_type,
        property_type_id,
        star_rating,
        person_capacity,
        public_address,
        bedrooms,
        beds,
        bathrooms,
        picture_urls
    } = listing;
    const { localized_currency, localized_nightly_price } = pricing_quote;
    const price = `${localized_currency} ${localized_nightly_price},00`;
    const url = `https://www.airbnb.com.br/rooms/${id}`;
    const stars = isNil(star_rating) ? '' : join('', repeat('★', parseInt(star_rating, 10)));

    return {
        [id]: {
            title: public_address,
            content: renderContent(name, property_type, property_type_id, price, picture_urls),
            comment: `
                ### ${name} ${stars}

                **${price}**

                ${_('Bedrooms')}: ${bedrooms}
                ${_('Beds')}: ${beds}
                ${_('Bathrooms')}: ${bathrooms}
                ${_('Accommodates up to')}: ${person_capacity}
                ${public_address}
                \n\n
                [${_('See the accommodation')}](${url})

                ${join('\n\n', map(picture => `![${property_type}](${picture})`, picture_urls))}

            `
        }
    };
}

function renderContent(name, type, type_id, price, pictures) {
    const building = 'http://i.imgur.com/gJU240K.png';
    const house = 'http://i.imgur.com/bEcOMhY.png';
    // A list with some property types is found in the end of this file
    const icon = cond([
        [contains(__, [1, 3, 5, 9, 37, 40, 43]), always(building)],
        [contains(__, [2, 4, 6, 11, 16, 22, 24, 36]), always(house)],
        [T, always(house)]
    ])(type_id);
    return (
        <div>
            <div style={ styles.thumbnailArea }>
                { join('', take(3, pictures).map(getThumbnail)) }
            </div>
            <div style={ styles.textArea }>
                <div>
                    <img src={ icon } alt={ type } />
                </div>
                <div>{ name }</div>
                <div><b>{ price }</b></div>
            </div>
        </div>
    );
}

function getThumbnail(src, index) {
    return (
        <div
            key={ `imagem${index}` }
            style={ merge(
                {
                    backgroundImage: `url(${src})`,
                    marginBottom: index === 2 ? '0px' : '5px'
                },
                styles.thumbnail)}>ㅤ
        </div>
    );
    // TODO: retirar caractere invisível da linha 123, ele foi adicionado por bug no rung-cli
}

function main(context, done) {
    const { location, guests, maxPrice, bedrooms, beds, bathrooms, currency } = context.params;

    return request.get(url)
        .query({
            locale: 'pt-BR',
            _limit: 20,
            location,
            guests,
            price_max: maxPrice,
            min_bedrooms: bedrooms,
            min_beds: beds,
            min_bathrooms: bathrooms,
            currency
        })
        .then(({ body }) => {
            const search = body.search_results || [];
            const alerts = mergeAll(map(createAlert, search));
            done({ alerts });
        })
        .catch(() => done({ alerts: {} }));
}

const currencies = [
    'AED', 'ARS', 'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CLP', 'COP',
    'CRC', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HRK', 'HUF', 'IDR',
    'ILS', 'INR', 'JPY', 'KRW', 'MAD', 'MXN', 'MYR', 'NOK', 'NZD',
    'PEN', 'PHP', 'PLN', 'RON', 'RUB', 'SAR', 'SEK', 'SGD', 'THB',
    'TRY', 'TWD', 'UAH', 'USD', 'UYU', 'VND', 'ZAR'
];

const params = {
    location: {
        description: _('Local'),
        type: Text,
        required: true
    },
    guests: {
        description: _('People'),
        type: Natural,
        default: 1
    },
    maxPrice: {
        description: _('Maximum price'),
        type: Natural,
        default: 100
    },
    bedrooms: {
        description: _('Bedrooms'),
        type: Natural,
        default: 1
    },
    beds: {
        description: _('Beds'),
        type: Natural,
        default: 1
    },
    bathrooms: {
        description: _('Bathrooms'),
        type: Natural,
        default: 1
    },
    currency: {
        description: _('Currency'),
        type: OneOf(currencies),
        required: true
    }
};

export default create(main, { params, primaryKey: true });

/**
* Property types
* 1 - Apartamento
* 2 - Casa
* 3 - Pousada
* 4 - Casa de campo
* 5 - Castelo
* 6 - Casa na árvore
* 8 - Barco
* 9 - Hostel
* 11 - Vila
* 16 - Tenda
* 18 - Gruta
* 22 - Chalé
* 24 - Cabana
* 25 - Trem
* 28 - Avião
* 33 - Outros
* 36 - Geminad
* 37 - Condomínio
* 40 - Hospedaria
* 43 - Hotel butique
*/
