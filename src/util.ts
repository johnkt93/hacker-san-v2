export namespace Util {
    export function interpolate(base: string, dict: Record<string, string>) {
        for (const [key, value] of Object.entries(dict)) {
            base = base.replace(new RegExp(`\{${key}\}`, "g"), value);
        }

        return base;
    }

    export function batch<T>(input: T[], batchSize = 10) {
        const batches: T[][] = [];
        for (let i = 0; i < input.length; i += batchSize) {
            batches.push(input.slice(i, i + batchSize));
        }
        return batches;
    }

    export function pluralize(
        amount: number,
        singular: string,
        plural: string,
    ) {
        return amount == 1 ? singular : plural;
    }
}
