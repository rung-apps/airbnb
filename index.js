import { create } from 'rung-sdk';
import {
    Natural,
    OneOf,
    IntegerMultiRange,
    DateTime,
    AutoComplete
} from 'rung-cli/dist/types';
import Bluebird from 'bluebird';
import agent from 'superagent';
import moment from 'moment';
import promisifyAgent from 'superagent-promise';
import {
    __,
    always,
    concat,
    cond,
    contains,
    evolve,
    filter,
    identity,
    ifElse,
    isNil,
    join,
    keys,
    length,
    lt,
    map,
    merge,
    mergeAll,
    pipe,
    repeat,
    replace,
    T,
    take,
    unless,
    when
} from 'ramda';

const request = promisifyAgent(agent, Bluebird);
const clientId = 'd306zoyjsyarp7ifhu67rjxn52tv0t20';
const url = `https://www.airbnb.com.br/api/v2/explore_tabs`;
const preview = [
    _('Room in apartment - Great for Dance Festival'),
    1,
    `${_('USD')} 44,00`,
    'https://a0.muscache.com/im/pictures/9335e630-a591-4aee-8229-5bb0f96c8d8e.jpg?aki_policy=large'
];

const currencies = {
    AUD: 'AU$',
    BGN: 'BGN',
    BRL: 'R$',
    CAD: 'CA$',
    CHF: 'CHF',
    CNY: 'CN¥',
    CZK: 'Kč',
    DKK: 'Dkr',
    EUR: '€',
    GBP: '£',
    HKD: 'HK$',
    HRK: 'kn',
    HUF: 'Ft',
    IDR: 'Rp',
    ILS: '₪',
    INR: 'Rs',
    JPY: '¥',
    KRW: '₩',
    MXN: 'MX$',
    MYR: 'RM',
    NOK: 'Nkr',
    NZD: 'NZ$',
    PHP: '₱',
    PLN: 'zł',
    RON: 'RON',
    RUB: 'RUB',
    SEK: 'Skr',
    SGD: 'S$',
    THB: '฿',
    TRY: 'TL',
    USD: '$',
    ZAR: 'R'
};

const styles = {
    textArea: {
        textAlign: 'center',
        color: '#FFFFFF',
        position: 'absolute',
        width: '145px'
    },
    thumbnail: {
        position: 'absolute',
        width: '165px',
        height: '125px',
        top: '0px',
        left: '0px'
    },
    name: {
        padding: '12px 0',
        height: '36px'
    },
    price: {
        fontSize: '16px',
        fontWeight: 'bold'
    }
};

const ellipsize = ifElse(
    pipe(length, lt(39)),
    pipe(take(36), concat(__, '...')),
    identity
);

const optimize = replace('=large', '=small');

function createAlert({ listing, pricing_quote }) {
    const {
        id,
        name,
        property_type_id,
        star_rating,
        person_capacity,
        bedrooms,
        beds,
        bathrooms,
        picture_urls,
        localized_city,
        localized_neighborhood,
        space_type
    } = listing;
    const price = `${pricing_quote.rate.amount_formatted},00`;
    const address = pipe(
        filter(identity),
        join(', ')
    )([localized_city, localized_neighborhood]);

    const url = `https://www.airbnb.com.br/rooms/${id}`;
    const stars = isNil(star_rating) ? '' : join('', repeat('★', parseInt(star_rating, 10)));

    return {
        [id]: {
            title: address,
            content: render(name, property_type_id, price, picture_urls[0]),
            comment: `
                ### ${name} ${stars}

                **${price}**

                ${_('Bedrooms')}: ${bedrooms}
                ${_('Beds')}: ${beds}
                ${_('Bathrooms')}: ${bathrooms}
                ${_('Accommodates up to')}: ${person_capacity}
                ${_('Space type')}: ${space_type}
                ${address}
                \n\n
                [${_('See the accommodation')}](${url})
            `,
            resources: picture_urls
        }
    };
}

function render(name, type_id, price, picture) {
    const building = 'https://i.imgur.com/gJU240K.png';
    const house = 'https://i.imgur.com/bEcOMhY.png';

    // A list with some property types that is found in the commented_api.txt file
    const icon = cond([
        [contains(__, [1, 3, 5, 9, 37, 40, 43]), always(
            { icon: building, description: _('Building') }
        )],
        [contains(__, [2, 4, 6, 11, 16, 22, 24, 36]), always(
            { icon: house, description: _('House') }
        )],
        [T, always({ icon: house, description: _('House') })]
    ])(type_id);

    return (
        <div>
            <img
                src={ optimize(picture) }
                style={ styles.thumbnail }
            />
            <div
                style={ merge(styles.thumbnail,
                    { backgroundColor: 'rgba(0, 0, 0, 0.6)' }
                ) }
            />
            <div style={ styles.textArea }>
                <img src={ icon.icon } alt={ icon.description } />
                <div
                    title={ name }
                    style={ styles.name }>
                    { ellipsize(name) }
                </div>
                <div style={ styles.price }>
                    { price }
                </div>
            </div>
        </div>
    );
}

function main(context, done) {
    const {
        location,
        guests,
        priceRange,
        checkin,
        checkout,
        bedrooms,
        beds,
        bathrooms,
        currency,
        wholeHouse
    } = context.params;
    const locale = context.locale === 'pt_BR' ? 'pt' : context.locale;
    const formatDate = date => moment(date, 'MM/DD/YYYY').format('YYYY-MM-DD');

    const extra = pipe(
        evolve({
            checkin: unless(isNil, formatDate),
            checkout: unless(isNil, formatDate),
            'room_types[]': when(always(wholeHouse === 'Sim'), always(
                'Entire home/apt'))
        }),
        filter(identity)
    )({ checkin, checkout, 'room_types[]': undefined });

    return request.get(url)
        .query(merge({
            version: '1.3.2',
            experiences_per_grid: '20',
            items_per_grid: '18',
            guidebooks_per_grid: '20',
            auto_ib: 'true',
            fetch_filters: 'true',
            is_new_homes_cards_experiment: 'true',
            show_groupings: 'false',
            timezone_offset: '-120',
            metadata_only: 'false',
            is_standard_search: 'true',
            selected_tab_id: 'home_tab',
            location,
            adults: guests,
            price_min: priceRange[0],
            price_max: priceRange[1],
            min_bedrooms: bedrooms,
            min_beds: beds,
            min_bathrooms: bathrooms,
            key: clientId,
            currency,
            locale
        }, extra))
        .then(({ body }) => {
            const places = body.explore_tabs[0].sections[0].listings || [];
            const alerts = mergeAll(map(createAlert, places));
            done({ alerts });
        })
        .catch(() => done({ alerts: {} }));
}

const params = {
    location: {
        description: _('Local'),
        type: AutoComplete,
        required: true
    },
    guests: {
        description: _('People'),
        type: Natural,
        default: 1
    },
    priceRange: {
        description: _('Select how much you want to pay per day'),
        type: IntegerMultiRange(0, 5000),
        default: [0, 100]
    },
    checkin: {
        description: _('Checkin date'),
        type: DateTime
    },
    checkout: {
        description: _('Checkout date'),
        type: DateTime
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
    // TODO: when we have selectbox in frontend, swap type of wholeHouse
    wholeHouse: {
        description: _('Only entire home/apt?'),
        type: OneOf(['Sim', 'Não']),
        default: 'Sim'
    },
    currency: {
        description: _('Currency'),
        type: OneOf(keys(currencies)),
        required: true
    }
};

export default create(main, {
    params,
    primaryKey: true,
    title: _('Book accommodation with Airbnb'),
    description: _('Book accommodation with AirBnb and get to know the world in a different way!'),
    preview: render(...preview)
});
