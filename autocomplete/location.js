export default function ({ input, lib, params }) {
    const { locale } = params
    return lib.request.get('https://www.airbnb.com.br/api/v2/autocompletes')
        .query({
            locale,
            num_results: 5,
            user_input: input,
            key: 'd306zoyjsyarp7ifhu67rjxn52tv0t20',
            api_version: '1.0.3'
        })
        .then(({ body }) => {
            const places = body.autocomplete_terms;
            return places.map(item => item.location.location_name);
        });
}
